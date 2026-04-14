import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CollaboratorFile {
  userId: string;
  displayName: string;
  fileName: string;
  filePath: string;
}

export function useCollaboratorFiles(roomCode: string) {
  const { user, profile } = useAuth();
  const [collaboratorFiles, setCollaboratorFiles] = useState<Map<string, CollaboratorFile>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Broadcast which file the current user is editing
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
        } as CollaboratorFile,
      });
    },
    [user, profile]
  );

  useEffect(() => {
    if (!user || !roomCode) return;

    const channel = supabase.channel(`collaborator-files-${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "active-file" }, ({ payload }) => {
        const fileInfo = payload as CollaboratorFile;
        if (fileInfo.userId !== user.id) {
          setCollaboratorFiles((prev) => {
            const next = new Map(prev);
            next.set(fileInfo.userId, fileInfo);
            return next;
          });
        }
      })
      .on("broadcast", { event: "user-left" }, ({ payload }) => {
        setCollaboratorFiles((prev) => {
          const next = new Map(prev);
          next.delete(payload.userId);
          return next;
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, roomCode]);

  return {
    collaboratorFiles,
    broadcastActiveFile,
  };
}
