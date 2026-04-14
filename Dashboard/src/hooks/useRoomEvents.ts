import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface RoomEvent {
  type: "user-joined" | "user-left" | "room-created";
  userId: string;
  displayName: string;
  timestamp: number;
}

interface ActiveFileInfo {
  userId: string;
  displayName: string;
  fileName: string;
  filePath: string;
}

export function useRoomEvents(roomCode: string) {
  const { user, profile } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasAnnouncedRef = useRef(false);

  // Broadcast room events
  const broadcastEvent = useCallback(
    (type: RoomEvent["type"]) => {
      if (!user || !channelRef.current) return;

      const displayName = profile?.display_name || user.email?.split("@")[0] || "Anonymous";

      channelRef.current.send({
        type: "broadcast",
        event: "room-event",
        payload: {
          type,
          userId: user.id,
          displayName,
          timestamp: Date.now(),
        } as RoomEvent,
      });
    },
    [user, profile]
  );

  // Broadcast which file user is editing
  const broadcastActiveFile = useCallback(
    (fileName: string, filePath: string) => {
      if (!user || !channelRef.current) return;

      const displayName = profile?.display_name || user.email?.split("@")[0] || "Anonymous";

      channelRef.current.send({
        type: "broadcast",
        event: "active-file",
        payload: {
          userId: user.id,
          displayName,
          fileName,
          filePath,
        } as ActiveFileInfo,
      });
    },
    [user, profile]
  );

  // Initialize channel and listen for events
  useEffect(() => {
    if (!user || !roomCode) return;

    const channel = supabase.channel(`room-events-${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "room-event" }, ({ payload }) => {
        const event = payload as RoomEvent;
        if (event.userId === user.id) return;

        switch (event.type) {
          case "user-joined":
            toast({
              title: "👋 User Joined",
              description: `${event.displayName} joined the room`,
            });
            break;
          case "user-left":
            toast({
              title: "👋 User Left",
              description: `${event.displayName} left the room`,
            });
            break;
          case "room-created":
            toast({
              title: "🎉 Room Created",
              description: `${event.displayName} created the room`,
            });
            break;
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && !hasAnnouncedRef.current) {
          hasAnnouncedRef.current = true;
          // Delay slightly to ensure other users are subscribed
          setTimeout(() => {
            broadcastEvent("user-joined");
          }, 500);
        }
      });

    channelRef.current = channel;

    return () => {
      // Broadcast leave before unsubscribing
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "room-event",
          payload: {
            type: "user-left",
            userId: user.id,
            displayName: profile?.display_name || user.email?.split("@")[0] || "Anonymous",
            timestamp: Date.now(),
          } as RoomEvent,
        });
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
      hasAnnouncedRef.current = false;
    };
  }, [user, profile, roomCode, broadcastEvent]);

  return {
    broadcastEvent,
    broadcastActiveFile,
  };
}
