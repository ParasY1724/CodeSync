import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CursorPosition {
  userId: string;
  displayName: string;
  color: string;
  line: number;
  col: number;
  fileName: string;
}

const CURSOR_COLORS = [
  "#FF6B9D",
  "#4AE3B5",
  "#00D4FF",
  "#a855f7",
  "#FFD93D",
  "#6BCB77",
  "#FF8C42",
  "#5C95FF",
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function useCursorSync(roomCode: string, activeFile: string) {
  const { user, profile } = useAuth();
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastPositionRef = useRef<{ line: number; col: number }>({ line: 1, col: 1 });

  // Send cursor position
  const updateCursorPosition = useCallback(
    (line: number, col: number) => {
      if (!user || !channelRef.current) return;

      // Throttle updates
      const now = Date.now();
      const lastUpdate = (lastPositionRef.current as any).lastUpdate || 0;
      if (now - lastUpdate < 50) return; // Max 20 updates per second

      lastPositionRef.current = { line, col, lastUpdate: now } as any;

      channelRef.current.send({
        type: "broadcast",
        event: "cursor-move",
        payload: {
          userId: user.id,
          displayName: profile?.display_name || user.email?.split("@")[0] || "Anonymous",
          color: getUserColor(user.id),
          line,
          col,
          fileName: activeFile,
        },
      });
    },
    [user, profile, activeFile]
  );

  // Initialize channel
  useEffect(() => {
    if (!user || !roomCode) return;

    const channel = supabase.channel(`cursors-${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "cursor-move" }, ({ payload }) => {
        const cursorData = payload as CursorPosition;
        if (cursorData.userId !== user.id) {
          setCursors((prev) => {
            const next = new Map(prev);
            next.set(cursorData.userId, cursorData);
            return next;
          });
        }
      })
      .on("broadcast", { event: "cursor-leave" }, ({ payload }) => {
        setCursors((prev) => {
          const next = new Map(prev);
          next.delete(payload.userId);
          return next;
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      // Notify others that we're leaving
      channel.send({
        type: "broadcast",
        event: "cursor-leave",
        payload: { userId: user.id },
      });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, roomCode]);

  // Filter cursors for current file
  const fileCursors = Array.from(cursors.values()).filter(
    (c) => c.fileName === activeFile
  );

  return {
    cursors: fileCursors,
    updateCursorPosition,
  };
}
