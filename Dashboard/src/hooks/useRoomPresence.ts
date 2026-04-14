import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PresenceState {
  online_at: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useRoomPresence(roomCode: string) {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!user || !roomCode) return;

    // Immediately show current user as online while waiting for presence sync
    const currentUserPresence: PresenceState = {
      online_at: new Date().toISOString(),
      user_id: user.id,
      display_name: profile?.display_name || user.email?.split("@")[0] || "Anonymous",
      avatar_url: profile?.avatar_url || null,
    };
    setOnlineUsers([currentUserPresence]);

    const channel = supabase.channel(`presence-${roomCode}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PresenceState[] = [];
        
        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            const presence = presences[0] as any;
            users.push({
              online_at: presence.online_at,
              user_id: presence.user_id,
              display_name: presence.display_name,
              avatar_url: presence.avatar_url,
            });
          }
        });
        
        // Sort by online_at to show who joined first
        users.sort((a, b) => new Date(a.online_at).getTime() - new Date(b.online_at).getTime());
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            display_name: profile?.display_name || user.email?.split("@")[0] || "Anonymous",
            avatar_url: profile?.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, profile, roomCode]);

  return {
    onlineUsers,
    isMuted,
    toggleMute,
  };
}
