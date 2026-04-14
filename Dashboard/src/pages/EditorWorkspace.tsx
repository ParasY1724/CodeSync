import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Share2, ChevronLeft, Code2, Cloud, CloudOff, Loader2, Home, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CodeEditorPanel from "@/components/editor/CodeEditorPanel";
import FileExplorer from "@/components/editor/FileExplorer";
import SocialSidebar from "@/components/editor/SocialSidebar";
import MobileNav from "@/components/editor/MobileNav";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRoom } from "@/hooks/useRoom";
import { useRoomFiles } from "@/hooks/useRoomFiles";
import { useCursorSync } from "@/hooks/useCursorSync";
import { useCodeSync } from "@/hooks/useCodeSync";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useRoomEvents } from "@/hooks/useRoomEvents";
import { useCollaboratorFiles } from "@/hooks/useCollaboratorFiles";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

type SaveStatus = "saved" | "saving" | "unsaved";
type MobileTab = "files" | "editor" | "chat";

const EditorWorkspace = () => {
  const { roomId: roomCode } = useParams();
  const [searchParams] = useSearchParams();
  const isCreateMode = searchParams.get("create") === "true";
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { room, participants, loading: roomLoading, leaveRoom, error } = useRoom(roomCode || "", isCreateMode);
  const { files, folders, fileTree, loading: filesLoading, createFile, createFolder, deleteFolder, updateFileContent, renameFile, deleteFile, getFileByPath, removeFileLocally, removeFolderLocally, uploadFromZip } = useRoomFiles(room?.id || null);
  
  const [activeFilePath, setActiveFilePath] = useState("");
  const [activeFileId, setActiveFileId] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  const isMobile = useIsMobile();
  const { onlineUsers } = useRoomPresence(roomCode || "");
  
  // Room events for join/leave toasts
  useRoomEvents(roomCode || "");
  
  // Track which file each collaborator is editing
  const { collaboratorFiles, broadcastActiveFile } = useCollaboratorFiles(roomCode || "");
  
  const { cursors, updateCursorPosition } = useCursorSync(roomCode || "", activeFilePath);
  const { remoteContent, deletedFile, deletedFolder, broadcastChange, broadcastFileDelete, broadcastFolderDelete, clearRemoteContent, clearDeletedFile, clearDeletedFolder } = useCodeSync(roomCode || "", activeFilePath);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLocalChangeRef = useRef(false);

  const username = profile?.display_name || user?.email?.split("@")[0] || "Anonymous";

  // Set initial active file when files load
  useEffect(() => {
    if (files.length > 0 && !activeFilePath) {
      const firstFile = files[0];
      setActiveFilePath(firstFile.path);
      setActiveFileId(firstFile.id);
      setCurrentContent(firstFile.content);
      // Broadcast the initial file
      broadcastActiveFile(firstFile.name, firstFile.path);
    }
  }, [files, activeFilePath, broadcastActiveFile]);

  // Broadcast active file when it changes
  useEffect(() => {
    if (activeFilePath) {
      const fileName = activeFilePath.split("/").pop() || activeFilePath;
      broadcastActiveFile(fileName, activeFilePath);
    }
  }, [activeFilePath, broadcastActiveFile]);

  // Apply remote content changes instantly
  useEffect(() => {
    if (remoteContent !== null && remoteContent !== currentContent) {
      console.log("Applying remote content change");
      isLocalChangeRef.current = false;
      setCurrentContent(remoteContent);
      clearRemoteContent();
    }
  }, [remoteContent, clearRemoteContent, currentContent]);

  // Handle remote file deletion - remove from local state and redirect if viewing deleted file
  useEffect(() => {
    if (!deletedFile) return;
    
    // Remove from local state immediately (in case realtime is delayed)
    removeFileLocally(deletedFile.fileId);
    
    // If viewing the deleted file, switch to another
    if (deletedFile.fileId === activeFileId) {
      const remainingFiles = files.filter(f => f.id !== deletedFile.fileId);
      if (remainingFiles.length > 0) {
        setActiveFilePath(remainingFiles[0].path);
        setActiveFileId(remainingFiles[0].id);
        setCurrentContent(remainingFiles[0].content);
      } else {
        setActiveFilePath("");
        setActiveFileId("");
        setCurrentContent("");
      }
      toast({
        title: "File Deleted",
        description: `${deletedFile.filePath} was deleted by another user.`,
      });
    }
    
    clearDeletedFile();
  }, [deletedFile, activeFileId, files, clearDeletedFile, removeFileLocally]);

  // Handle remote folder deletion - redirect if viewing deleted file
  useEffect(() => {
    if (!deletedFolder) return;
    
    // Remove from local state immediately
    removeFolderLocally(deletedFolder.folderPath, deletedFolder.deletedFileIds);
    
    // If viewing a file in the deleted folder, switch to another
    const isActiveInDeletedFolder = activeFilePath.startsWith(`${deletedFolder.folderPath}/`) || 
      deletedFolder.deletedFileIds.includes(activeFileId);
    
    if (isActiveInDeletedFolder) {
      const remainingFiles = files.filter(f => 
        !f.path.startsWith(`${deletedFolder.folderPath}/`) && 
        !deletedFolder.deletedFileIds.includes(f.id)
      );
      if (remainingFiles.length > 0) {
        setActiveFilePath(remainingFiles[0].path);
        setActiveFileId(remainingFiles[0].id);
        setCurrentContent(remainingFiles[0].content);
      } else {
        setActiveFilePath("");
        setActiveFileId("");
        setCurrentContent("");
      }
      toast({
        title: "Folder Deleted",
        description: `${deletedFolder.folderPath} was deleted by another user.`,
      });
    }
    
    clearDeletedFolder();
  }, [deletedFolder, activeFilePath, activeFileId, files, clearDeletedFolder, removeFolderLocally]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleContentChange = useCallback((content: string) => {
    isLocalChangeRef.current = true;
    setCurrentContent(content);
    setSaveStatus("unsaved");
    
    // Broadcast change instantly to other users
    broadcastChange(content);
    
    // Debounce database save (for persistence)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      if (activeFileId) {
        await updateFileContent(activeFileId, content);
        setSaveStatus("saved");
      }
      saveTimeoutRef.current = null;
    }, 1500);
  }, [activeFileId, updateFileContent, broadcastChange]);

  const handleFileSelect = useCallback((filePath: string, fileId: string) => {
    // Save current file before switching
    if (activeFileId && currentContent && saveStatus !== "saved") {
      updateFileContent(activeFileId, currentContent);
      setSaveStatus("saved");
    }
    
    setActiveFilePath(filePath);
    setActiveFileId(fileId);
    
    const file = getFileByPath(filePath);
    if (file) {
      setCurrentContent(file.content);
      setSaveStatus("saved");
    }
    
    // Broadcast which file we're editing
    const fileName = filePath.split("/").pop() || filePath;
    broadcastActiveFile(fileName, filePath);
    
    // On mobile, switch to editor after selecting file
    if (isMobile) {
      setMobileTab("editor");
    }
  }, [activeFileId, currentContent, saveStatus, updateFileContent, getFileByPath, isMobile, broadcastActiveFile]);

  const handleCreateFile = useCallback(async (name: string, folderPath?: string) => {
    const filePath = folderPath ? `${folderPath}/${name}` : name;
    const newFile = await createFile(name, filePath, `// ${name}\n\n// Start coding here...`);
    if (newFile) {
      setActiveFilePath(newFile.path);
      setActiveFileId(newFile.id);
      setCurrentContent(newFile.content);
      setSaveStatus("saved");
      toast({
        title: "File Created",
        description: `${name} has been created.`,
      });
      if (isMobile) {
        setMobileTab("editor");
      }
    }
  }, [createFile, isMobile]);

  const handleCreateFolder = useCallback(async (name: string, parentPath?: string | null) => {
    const folder = await createFolder(name, parentPath);
    if (folder) {
      toast({
        title: "Folder Created",
        description: `${name} folder has been created.`,
      });
    }
  }, [createFolder]);

  const handleDeleteFolder = useCallback(async (folderId: string, folderPath: string) => {
    const result = await deleteFolder(folderId, folderPath);
    if (result.success) {
      // Broadcast folder deletion to other users
      broadcastFolderDelete(folderId, folderPath, result.deletedFileIds);
      
      // If active file was in the deleted folder, clear selection
      if (activeFilePath.startsWith(folderPath + "/") || activeFilePath === folderPath) {
        const remainingFiles = files.filter(f => !f.path.startsWith(folderPath + "/") && f.path !== folderPath);
        if (remainingFiles.length > 0) {
          setActiveFilePath(remainingFiles[0].path);
          setActiveFileId(remainingFiles[0].id);
          setCurrentContent(remainingFiles[0].content);
        } else {
          setActiveFilePath("");
          setActiveFileId("");
          setCurrentContent("");
        }
      }
      toast({
        title: "Folder Deleted",
        description: "Folder and its contents have been deleted.",
      });
    }
  }, [deleteFolder, activeFilePath, files, broadcastFolderDelete]);

  const handleUploadZip = useCallback(async (zipFiles: { path: string; content: string }[], zipFolders: string[]) => {
    const success = await uploadFromZip(zipFiles, zipFolders);
    if (success && zipFiles.length > 0) {
      // Select the first file
      setActiveFilePath(zipFiles[0].path);
      setActiveFileId("");
      setCurrentContent(zipFiles[0].content);
    }
    return success;
  }, [uploadFromZip]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    // Find file path before deletion for broadcast
    const fileToDelete = files.find(f => f.id === fileId);
    const filePath = fileToDelete?.path || "";
    
    const success = await deleteFile(fileId);
    if (!success) {
      toast({
        title: "Error",
        description: "Failed to delete file.",
        variant: "destructive",
      });
      return;
    }
    
    // Broadcast deletion to other users
    broadcastFileDelete(fileId, filePath);
    
    // If deleted the active file, switch to another
    if (fileId === activeFileId) {
      const remainingFiles = files.filter(f => f.id !== fileId);
      if (remainingFiles.length > 0) {
        setActiveFilePath(remainingFiles[0].path);
        setActiveFileId(remainingFiles[0].id);
        setCurrentContent(remainingFiles[0].content);
      } else {
        setActiveFilePath("");
        setActiveFileId("");
        setCurrentContent("");
      }
    }
    
    toast({
      title: "File Deleted",
      description: "File has been deleted.",
    });
  }, [deleteFile, activeFileId, files, broadcastFileDelete]);

  const handleRenameFile = useCallback(async (fileId: string, newName: string) => {
    await renameFile(fileId, newName);
    
    // Update active file path if renamed the active file
    if (fileId === activeFileId) {
      setActiveFilePath(newName);
    }
    
    toast({
      title: "File Renamed",
      description: `File renamed to ${newName}.`,
    });
  }, [renameFile, activeFileId]);

  const handleLeaveRoom = async () => {
    // Save current file before leaving
    if (activeFileId && currentContent) {
      await updateFileContent(activeFileId, currentContent);
    }
    await leaveRoom();
    navigate("/");
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/editor/${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied!",
      description: "Share this link with your team to collaborate.",
    });
  };

  // Cleanup save timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (authLoading || roomLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground z-10">Loading workspace...</div>
      </div>
    );
  }

  // Show error state if room not found
  if (error && !room) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="z-10 text-center space-y-4">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-foreground">Room Not Found</h1>
          <p className="text-muted-foreground max-w-md">
            The room "{roomCode}" doesn't exist or has been deleted.
          </p>
          <Button variant="gradient" onClick={() => navigate("/")} className="mt-4">
            <Home className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col relative overflow-hidden pb-14">
        
        {/* Mobile Navbar */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-12 px-3 flex items-center justify-between glass-card rounded-none border-x-0 border-t-0 z-20"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleLeaveRoom}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="p-1">
                <Code2 className="w-3 h-3 text-white " />
              </div>
              <span className="font-bold text-sm gradient-text">CodeSync</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Save Status */}
            <div className="flex items-center gap-1 text-xs">
              {saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />}
              {saveStatus === "saved" && <Cloud className="w-3 h-3 text-codesync-lime" />}
              {saveStatus === "unsaved" && <CloudOff className="w-3 h-3 text-muted-foreground" />}
            </div>
            
            <Button
              variant="gradient-outline"
              size="sm"
              onClick={handleShare}
              className="rounded-full px-3 h-8 text-xs"
            >
              <Share2 className="w-3 h-3" />
            </Button>
          </div>
        </motion.nav>

        {/* Mobile Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileTab === "files" && (
              <motion.div
                key="files"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 overflow-hidden z-10"
              >
                <FileExplorer 
                  activeFile={activeFilePath} 
                  onFileSelect={handleFileSelect}
                  files={files}
                  folders={folders}
                  fileTree={fileTree}
                  loading={filesLoading}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  onDeleteFile={handleDeleteFile}
                  onDeleteFolder={handleDeleteFolder}
                  onRenameFile={handleRenameFile}
                  onUploadZip={handleUploadZip}
                />
              </motion.div>
            )}
            
            {mobileTab === "editor" && (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex-1 overflow-hidden z-10"
              >
                <CodeEditorPanel 
                  activeFile={activeFilePath || "untitled.js"}
                  fileContent={currentContent}
                  onContentChange={handleContentChange}
                  cursors={cursors}
                  onCursorMove={updateCursorPosition}
                />
              </motion.div>
            )}
            
            {mobileTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 overflow-hidden z-10"
              >
                <SocialSidebar 
                  roomId={room?.id || ""} 
                  roomCode={roomCode || ""} 
                  collaboratorFiles={collaboratorFiles}
                  onNavigateToFile={handleFileSelect}
                  files={files}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Nav */}
        <MobileNav 
          activeTab={mobileTab} 
          onTabChange={setMobileTab}
          onlineCount={onlineUsers.length}
        />
      </div>
    );
  }

  // Desktop Layout with Resizable Panels
  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-14 px-4 flex items-center justify-between glass-card rounded-none border-x-0 border-t-0 z-20"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeaveRoom}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5">
              <Code2 className="w-4 h-4 text-white " />
            </div>
            <span className="font-bold gradient-text">CodeSync</span>
          </div>
          
          {/* Panel Toggle Buttons */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={leftPanelCollapsed ? "Show Files" : "Hide Files"}
            >
              {leftPanelCollapsed ? (
                <PanelLeft className="w-4 h-4 text-muted-foreground" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={rightPanelCollapsed ? "Show Chat" : "Hide Chat"}
            >
              {rightPanelCollapsed ? (
                <PanelRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                <span className="text-yellow-400">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Cloud className="w-3.5 h-3.5 text-codesync-lime" />
                <span className="text-codesync-lime">Saved</span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <CloudOff className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Unsaved</span>
              </>
            )}
          </div>
          
          <Button
            variant="gradient-outline"
            size="sm"
            onClick={handleShare}
            className="rounded-full px-4"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </motion.nav>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* File Explorer Panel */}
          {!leftPanelCollapsed && (
            <>
              <ResizablePanel 
                defaultSize={15} 
                minSize={10} 
                maxSize={30}
                className="z-10"
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="h-full glass-card rounded-none border-y-0 border-l-0 overflow-y-auto scrollbar-thin"
                >
                  <FileExplorer 
                    activeFile={activeFilePath} 
                    onFileSelect={handleFileSelect}
                    files={files}
                    folders={folders}
                    fileTree={fileTree}
                    loading={filesLoading}
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                    onDeleteFile={handleDeleteFile}
                    onDeleteFolder={handleDeleteFolder}
                    onRenameFile={handleRenameFile}
                    onUploadZip={handleUploadZip}
                  />
                </motion.div>
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-transparent hover:bg-codesync-purple/20 transition-colors" />
            </>
          )}

          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={leftPanelCollapsed && rightPanelCollapsed ? 100 : leftPanelCollapsed || rightPanelCollapsed ? 80 : 60} className="z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-full flex flex-col overflow-hidden"
            >
              <CodeEditorPanel 
                activeFile={activeFilePath || "untitled.js"}
                fileContent={currentContent}
                onContentChange={handleContentChange}
                cursors={cursors}
                onCursorMove={updateCursorPosition}
              />
            </motion.div>
          </ResizablePanel>

          {/* Social Sidebar Panel */}
          {!rightPanelCollapsed && (
            <>
              <ResizableHandle withHandle className="bg-transparent hover:bg-codesync-purple/20 transition-colors" />
              <ResizablePanel 
                defaultSize={25} 
                minSize={15} 
                maxSize={40}
                className="z-10"
              >
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="h-full glass-card rounded-none border-y-0 border-r-0 overflow-hidden"
                >
                  <SocialSidebar 
                    roomId={room?.id || ""} 
                    roomCode={roomCode || ""} 
                    collaboratorFiles={collaboratorFiles}
                    onNavigateToFile={handleFileSelect}
                    files={files}
                  />
                </motion.div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default EditorWorkspace;
