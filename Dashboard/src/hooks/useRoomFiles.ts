import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  sanitizeFileName, 
  sanitizeFilePath,
  sanitizeFileContent, 
  isValidFileName, 
  isValidFileContent,
  escapeSqlLike,
  MAX_FILE_NAME_LENGTH,
  MAX_FILE_CONTENT_LENGTH 
} from "@/lib/validation";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  content: string;
  extension: string | null;
  type: "file";
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  parent_path: string | null;
  type: "folder";
}

export type TreeNode = (FileNode | FolderNode) & { children?: TreeNode[] };

const DEFAULT_FILES = [
  { name: "app.py", path: "app.py", extension: "py", content: `print("Hello World")` }];

export function useRoomFiles(roomId: string | null) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const removeFileLocally = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const removeFolderLocally = useCallback((folderPath: string, fileIds: string[]) => {
    setFolders((prev) => prev.filter((f) => !f.path.startsWith(folderPath) && f.path !== folderPath));
    setFiles((prev) => prev.filter((f) => !f.path.startsWith(`${folderPath}/`) && !fileIds.includes(f.id)));
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!roomId) return;

    const [filesRes, foldersRes] = await Promise.all([
      supabase.from("files").select("*").eq("room_id", roomId),
      supabase.from("folders").select("*").eq("room_id", roomId),
    ]);

    if (filesRes.error) {
      console.error("Error fetching files:", filesRes.error);
    }
    if (foldersRes.error) {
      console.error("Error fetching folders:", foldersRes.error);
    }

    const fetchedFiles = (filesRes.data || []).map((f) => ({
      ...f,
      type: "file" as const,
    }));
    const fetchedFolders = (foldersRes.data || []).map((f) => ({
      ...f,
      type: "folder" as const,
    }));

    setFiles(fetchedFiles);
    setFolders(fetchedFolders);
    setLoading(false);

    if (fetchedFiles.length === 0 && fetchedFolders.length === 0 && !initialized) {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("created_at")
        .eq("id", roomId)
        .single();
      
      if (roomData) {
        const roomCreatedAt = new Date(roomData.created_at);
        const now = new Date();
        const secondsSinceCreation = (now.getTime() - roomCreatedAt.getTime()) / 1000;
        
        if (secondsSinceCreation < 30) {
          setInitialized(true);
          await initializeDefaultFiles();
        }
      }
    }
    setInitialized(true);
  }, [roomId, initialized]);

  const initializeDefaultFiles = useCallback(async () => {
    if (!roomId || !user) return;

    const filesToInsert = DEFAULT_FILES.map((f) => ({
      room_id: roomId,
      name: f.name,
      path: f.path,
      content: f.content,
      extension: f.extension,
      created_by: user.id,
    }));

    const { data, error } = await supabase.from("files").insert(filesToInsert).select();
    
    if (error) {
      console.error("Error initializing files:", error);
      return;
    }

    if (data) {
      setFiles(data.map((f) => ({ ...f, type: "file" as const })));
    }
  }, [roomId, user]);

  const createFile = useCallback(
    async (name: string, path: string, content: string = "") => {
      if (!roomId || !user) return null;

      const sanitizedName = sanitizeFileName(name);
      const sanitizedPath = sanitizeFilePath(path);
      const sanitizedContent = sanitizeFileContent(content);
      
      if (!isValidFileName(sanitizedName)) {
        console.error("Invalid file name");
        return null;
      }

      const extension = sanitizedName.split(".").pop() || null;
      const { data, error } = await supabase
        .from("files")
        .insert({
          room_id: roomId,
          name: sanitizedName,
          path: sanitizedPath,
          content: sanitizedContent,
          extension,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating file:", error);
        return null;
      }

      // Immediately add to local state for the creator
      if (data) {
        setFiles((prev) => {
          if (prev.some((f) => f.id === data.id)) return prev;
          return [...prev, { ...data, type: "file" as const }];
        });
      }

      return data ? { ...data, type: "file" as const } : null;
    },
    [roomId, user]
  );

  const createFolder = useCallback(
    async (name: string, parentPath: string | null = null) => {
      if (!roomId || !user) return null;

      const sanitizedName = sanitizeFileName(name);
      if (!sanitizedName || sanitizedName.length > MAX_FILE_NAME_LENGTH) {
        console.error("Invalid folder name");
        return null;
      }

      const path = parentPath ? `${parentPath}/${sanitizedName}` : sanitizedName;

      const { data, error } = await supabase
        .from("folders")
        .insert({
          room_id: roomId,
          name: sanitizedName,
          path,
          parent_path: parentPath,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating folder:", error);
        return null;
      }

      if (data) {
        setFolders((prev) => [...prev, { ...data, type: "folder" as const }]);
      }

      return data;
    },
    [roomId, user]
  );

  const deleteFolder = useCallback(
    async (folderId: string, folderPath: string): Promise<{ success: boolean; deletedFileIds: string[] }> => {
      if (!roomId) return { success: false, deletedFileIds: [] };

      // Escape SQL LIKE wildcards to prevent unintended pattern matching
      const escapedPath = escapeSqlLike(folderPath);

      // Get files that will be deleted for redirecting users
      const filesToDelete = files.filter(
        (f) => f.path.startsWith(`${folderPath}/`) || f.path === folderPath
      );
      const deletedFileIds = filesToDelete.map((f) => f.id);

      // Delete all files in this folder and subfolders
      const { error: filesError } = await supabase
        .from("files")
        .delete()
        .eq("room_id", roomId)
        .or(`path.like.${escapedPath}/%,path.eq.${folderPath}`);

      if (filesError) {
        console.error("Error deleting folder files:", filesError);
        return { success: false, deletedFileIds: [] };
      }

      // Delete all subfolders
      const { error: subfoldersError } = await supabase
        .from("folders")
        .delete()
        .eq("room_id", roomId)
        .like("path", `${escapedPath}/%`);

      if (subfoldersError) {
        console.error("Error deleting subfolders:", subfoldersError);
      }

      // Delete the folder itself
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId)
        .eq("room_id", roomId);

      if (error) {
        console.error("Error deleting folder:", error);
        return { success: false, deletedFileIds: [] };
      }

      // Immediately update local state
      setFolders((prev) => prev.filter((f) => f.id !== folderId && !f.path.startsWith(`${folderPath}/`)));
      setFiles((prev) => prev.filter((f) => !f.path.startsWith(`${folderPath}/`) && f.path !== folderPath));
      
      return { success: true, deletedFileIds };
    },
    [roomId, files]
  );

  const deleteAllFiles = useCallback(async () => {
    if (!roomId) return false;

    const { error: filesError } = await supabase
      .from("files")
      .delete()
      .eq("room_id", roomId);

    if (filesError) {
      console.error("Error deleting all files:", filesError);
      return false;
    }

    const { error: foldersError } = await supabase
      .from("folders")
      .delete()
      .eq("room_id", roomId);

    if (foldersError) {
      console.error("Error deleting all folders:", foldersError);
      return false;
    }

    setFiles([]);
    setFolders([]);
    return true;
  }, [roomId]);

  const uploadFromZip = useCallback(
    async (zipFiles: { path: string; content: string }[], zipFolders: string[]) => {
      if (!roomId || !user) return false;

      // Delete all existing files first
      await deleteAllFiles();

      // Create folders
      const folderInserts = zipFolders.map((folderPath) => {
        const parts = folderPath.split("/");
        const name = parts[parts.length - 1];
        const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
        return {
          room_id: roomId,
          name,
          path: folderPath,
          parent_path: parentPath,
          created_by: user.id,
        };
      });

      if (folderInserts.length > 0) {
        const { data: foldersData, error: foldersError } = await supabase
          .from("folders")
          .insert(folderInserts)
          .select();

        if (foldersError) {
          console.error("Error creating folders from zip:", foldersError);
        } else if (foldersData) {
          setFolders(foldersData.map((f) => ({ ...f, type: "folder" as const })));
        }
      }

      // Create files
      const fileInserts = zipFiles.map((file) => {
        const parts = file.path.split("/");
        const name = parts[parts.length - 1];
        const extension = name.includes(".") ? name.split(".").pop() || null : null;
        return {
          room_id: roomId,
          name,
          path: file.path,
          content: file.content,
          extension,
          created_by: user.id,
        };
      });

      if (fileInserts.length > 0) {
        const { data: filesData, error: filesError } = await supabase
          .from("files")
          .insert(fileInserts)
          .select();

        if (filesError) {
          console.error("Error creating files from zip:", filesError);
          return false;
        }

        if (filesData) {
          setFiles(filesData.map((f) => ({ ...f, type: "file" as const })));
        }
      }

      return true;
    },
    [roomId, user, deleteAllFiles]
  );

  const updateFileContent = useCallback(
    async (fileId: string, content: string) => {
      if (!roomId) return;

      const sanitizedContent = sanitizeFileContent(content);
      
      const { error } = await supabase
        .from("files")
        .update({ content: sanitizedContent })
        .eq("id", fileId)
        .eq("room_id", roomId);

      if (error) {
        console.error("Error updating file:", error);
      }
    },
    [roomId]
  );

  const renameFile = useCallback(
    async (fileId: string, newName: string) => {
      if (!roomId) return;

      const sanitizedName = sanitizeFileName(newName);
      if (!isValidFileName(sanitizedName)) {
        console.error("Invalid file name");
        return;
      }

      const extension = sanitizedName.split(".").pop() || null;
      const { error } = await supabase
        .from("files")
        .update({ name: sanitizedName, path: sanitizedName, extension })
        .eq("id", fileId)
        .eq("room_id", roomId);

      if (error) {
        console.error("Error renaming file:", error);
      }
    },
    [roomId]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!roomId) return false;

      const { error } = await supabase
        .from("files")
        .delete()
        .eq("id", fileId)
        .eq("room_id", roomId);

      if (error) {
        console.error("Error deleting file:", error);
        return false;
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      return true;
    },
    [roomId]
  );

  const getFileByPath = useCallback(
    (path: string) => {
      return files.find((f) => f.path === path);
    },
    [files]
  );

  const buildFileTree = useCallback((): TreeNode[] => {
    const folderMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create folder nodes
    const sortedFolders = [...folders].sort((a, b) => a.path.localeCompare(b.path));
    sortedFolders.forEach((folder) => {
      const node: TreeNode = { ...folder, children: [] };
      folderMap.set(folder.path, node);

      if (!folder.parent_path) {
        rootNodes.push(node);
      } else {
        const parent = folderMap.get(folder.parent_path);
        if (parent && parent.children) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    });

    // Add files to their parent folders or root
    files.forEach((file) => {
      const fileNode: TreeNode = { ...file, type: "file" };
      const pathParts = file.path.split("/");
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join("/");
        const parent = folderMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(fileNode);
        } else {
          rootNodes.push(fileNode);
        }
      } else {
        rootNodes.push(fileNode);
      }
    });

    // Sort children: folders first, then files, alphabetically
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.children) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootNodes);
    return rootNodes;
  }, [files, folders]);

  useEffect(() => {
    if (roomId) {
      fetchFiles();
    }
  }, [roomId, fetchFiles]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-files-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "files",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newFile = payload.new as FileNode & { room_id: string };
            setFiles((prev) => {
              if (prev.some((f) => f.id === newFile.id)) return prev;
              return [...prev, { ...newFile, type: "file" }];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedFile = payload.new as FileNode & { room_id: string };
            setFiles((prev) =>
              prev.map((f) =>
                f.id === updatedFile.id ? { ...updatedFile, type: "file" } : f
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedFile = payload.old as { id: string };
            setFiles((prev) => prev.filter((f) => f.id !== deletedFile.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "folders",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newFolder = payload.new as FolderNode & { room_id: string };
            setFolders((prev) => {
              if (prev.some((f) => f.id === newFolder.id)) return prev;
              return [...prev, { ...newFolder, type: "folder" }];
            });
          } else if (payload.eventType === "DELETE") {
            const deletedFolder = payload.old as { id: string };
            setFolders((prev) => prev.filter((f) => f.id !== deletedFolder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return {
    files,
    folders,
    loading,
    fileTree: buildFileTree(),
    createFile,
    createFolder,
    deleteFolder,
    updateFileContent,
    renameFile,
    deleteFile,
    getFileByPath,
    refetch: fetchFiles,
    removeFileLocally,
    removeFolderLocally,
    uploadFromZip,
    deleteAllFiles,
  };
}