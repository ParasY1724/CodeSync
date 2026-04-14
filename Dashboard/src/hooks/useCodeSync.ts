import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CodeChange {
  userId: string;
  filePath: string;
  content: string;
  timestamp: number;
  version: number;
}

interface FileDeleted {
  fileId: string;
  filePath: string;
}

interface FolderDeleted {
  folderId: string;
  folderPath: string;
  deletedFileIds: string[];
}

export function useCodeSync(roomCode: string, activeFilePath: string) {
  const { user } = useAuth();
  const [remoteContent, setRemoteContent] = useState<string | null>(null);
  const [deletedFile, setDeletedFile] = useState<FileDeleted | null>(null);
  const [deletedFolder, setDeletedFolder] = useState<FolderDeleted | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef<string>("");
  const versionRef = useRef(0);
  const pendingChangesRef = useRef<CodeChange[]>([]);

  // Broadcast code changes instantly
  const broadcastChange = useCallback(
    (content: string) => {
      if (!user || !channelRef.current || !activeFilePath) return;
      
      // Don't send if content is same as last sent
      if (content === lastSentRef.current) return;
      lastSentRef.current = content;
      versionRef.current++;

      channelRef.current.send({
        type: "broadcast",
        event: "code-change",
        payload: {
          userId: user.id,
          filePath: activeFilePath,
          content,
          timestamp: Date.now(),
          version: versionRef.current,
        } as CodeChange,
      });
    },
    [user, activeFilePath]
  );

  // Broadcast file deletion to other users
  const broadcastFileDelete = useCallback(
    (fileId: string, filePath: string) => {
      if (!user || !channelRef.current) return;

      channelRef.current.send({
        type: "broadcast",
        event: "file-deleted",
        payload: { fileId, filePath } as FileDeleted,
      });
    },
    [user]
  );

  // Broadcast folder deletion to other users
  const broadcastFolderDelete = useCallback(
    (folderId: string, folderPath: string, deletedFileIds: string[]) => {
      if (!user || !channelRef.current) return;

      channelRef.current.send({
        type: "broadcast",
        event: "folder-deleted",
        payload: { folderId, folderPath, deletedFileIds } as FolderDeleted,
      });
    },
    [user]
  );

  // Handle incoming changes with conflict resolution
  const handleRemoteChange = useCallback(
    (change: CodeChange) => {
      if (change.userId === user?.id || change.filePath !== activeFilePath) return;
      
      console.log("Received code change from:", change.userId, "version:", change.version);
      
      // Simple last-write-wins with timestamp
      // Queue changes and apply the most recent
      pendingChangesRef.current.push(change);
      
      // Sort by timestamp and apply the latest
      pendingChangesRef.current.sort((a, b) => b.timestamp - a.timestamp);
      const latestChange = pendingChangesRef.current[0];
      
      // Clear old pending changes (keep only last 5)
      if (pendingChangesRef.current.length > 5) {
        pendingChangesRef.current = pendingChangesRef.current.slice(0, 5);
      }
      
      setRemoteContent(latestChange.content);
    },
    [user?.id, activeFilePath]
  );

  // Initialize channel
  useEffect(() => {
    if (!user || !roomCode) return;

    const channel = supabase.channel(`code-sync-${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "code-change" }, ({ payload }) => {
        handleRemoteChange(payload as CodeChange);
      })
      .on("broadcast", { event: "file-deleted" }, ({ payload }) => {
        setDeletedFile(payload as FileDeleted);
      })
      .on("broadcast", { event: "folder-deleted" }, ({ payload }) => {
        setDeletedFolder(payload as FolderDeleted);
      })
      .subscribe((status) => {
        console.log("Code sync channel status:", status);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, roomCode, handleRemoteChange]);

  // Reset remote content when file changes
  useEffect(() => {
    setRemoteContent(null);
    lastSentRef.current = "";
    versionRef.current = 0;
    pendingChangesRef.current = [];
  }, [activeFilePath]);

  return {
    remoteContent,
    deletedFile,
    deletedFolder,
    broadcastChange,
    broadcastFileDelete,
    broadcastFolderDelete,
    clearRemoteContent: () => setRemoteContent(null),
    clearDeletedFile: () => setDeletedFile(null),
    clearDeletedFolder: () => setDeletedFolder(null),
  };
}
