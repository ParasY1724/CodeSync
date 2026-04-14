import { useState, useRef } from "react";
import { motion } from "framer-motion";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileJson, 
  FileType, 
  ChevronRight,
  ChevronDown,
  Plus,
  Download,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  FolderPlus,
  FilePlus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FileNode as FileData, FolderNode, TreeNode } from "@/hooks/useRoomFiles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface FileExplorerProps {
  activeFile: string;
  onFileSelect: (file: string, fileId: string) => void;
  files: FileData[];
  folders: FolderNode[];
  fileTree: TreeNode[];
  loading: boolean;
  onCreateFile: (name: string, folderPath?: string) => void;
  onCreateFolder: (name: string, parentPath?: string | null) => void;
  onDeleteFile?: (fileId: string) => void;
  onDeleteFolder?: (folderId: string, folderPath: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onUploadZip?: (files: { path: string; content: string }[], folders: string[]) => Promise<boolean>;
}

const getFileIcon = (extension?: string) => {
  switch (extension) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "cpp":
    case "py" :
      return <FileCode className="w-4 h-4 text-yellow-400" />;
    case "json":
      return <FileJson className="w-4 h-4 text-amber-500" />;
    case "css":
      return <FileType className="w-4 h-4 text-blue-400" />;
    case "html":
      return <FileType className="w-4 h-4 text-orange-400" />;
    default:
      return <FileType className="w-4 h-4 text-muted-foreground" />;
  }
};

const FileItem = ({ 
  node, 
  level = 0, 
  activeFile, 
  onFileSelect,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onCreateFile,
  onCreateFolder,
}: { 
  node: TreeNode; 
  level?: number;
  activeFile: string;
  onFileSelect: (file: string, fileId: string) => void;
  onDeleteFile?: (fileId: string) => void;
  onDeleteFolder?: (folderId: string, folderPath: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onCreateFile?: (name: string, folderPath?: string) => void;
  onCreateFolder?: (name: string, parentPath?: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [showNewInput, setShowNewInput] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const isActive = node.type === "file" && node.path === activeFile;

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== node.name && node.id) {
      onRenameFile?.(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setRenameValue(node.name);
      setIsRenaming(false);
    }
  };

  const handleNewItemKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newItemName.trim()) {
      if (showNewInput === "file") {
        onCreateFile?.(newItemName.trim(), node.path);
      } else if (showNewInput === "folder") {
        onCreateFolder?.(newItemName.trim(), node.path);
      }
      setNewItemName("");
      setShowNewInput(null);
    } else if (e.key === "Escape") {
      setNewItemName("");
      setShowNewInput(null);
    }
  };

  if (node.type === "folder") {
    return (
      <div>
        <div
          className="group w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors text-sm"
          style={{ paddingLeft: `${level * 12 + 12}px` }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex-1 flex items-center gap-2 text-left"
          >
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            {isOpen ? (
              <FolderOpen className="w-4 h-4 text-purple-400" />
            ) : (
              <Folder className="w-4 h-4 text-purple-400" />
            )}
            <span className="text-foreground">{node.name}</span>
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
              >
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-background border border-white/10 z-50">
              <DropdownMenuItem
                onClick={() => {
                  setIsOpen(true);
                  setShowNewInput("file");
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5" />
                New File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsOpen(true);
                  setShowNewInput("folder");
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteFolder?.(node.id, node.path)}
                className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {showNewInput && (
              <div
                className="flex items-center gap-2 px-3 py-1"
                style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}
              >
                {showNewInput === "folder" ? (
                  <Folder className="w-4 h-4 text-purple-400" />
                ) : (
                  <FileType className="w-4 h-4 text-muted-foreground" />
                )}
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={handleNewItemKeyDown}
                  onBlur={() => {
                    if (!newItemName.trim()) {
                      setShowNewInput(null);
                    }
                  }}
                  placeholder={showNewInput === "folder" ? "folder name" : "filename.js"}
                  autoFocus
                  className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-codesync-purple"
                />
              </div>
            )}
            {node.children?.map((child) => (
              <FileItem
                key={child.path}
                node={child}
                level={level + 1}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                onDeleteFile={onDeleteFile}
                onDeleteFolder={onDeleteFolder}
                onRenameFile={onRenameFile}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
              />
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-sm ${
        isActive 
          ? "bg-white/10 border-l-2 border-l-codesync-purple" 
          : "hover:bg-white/5"
      }`}
      style={{ paddingLeft: `${level * 12 + 28}px` }}
    >
      <button
        onClick={() => onFileSelect(node.path, node.id || "")}
        className="flex-1 flex items-center gap-2 text-left"
      >
        {getFileIcon(node.type === "file" ? node.extension || undefined : undefined)}
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRename}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/10 border border-white/20 rounded px-1 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-codesync-purple"
          />
        ) : (
          <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
            {node.name}
          </span>
        )}
      </button>
      
      {!isRenaming && node.id && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
            >
              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 bg-background border border-white/10 z-50">
            <DropdownMenuItem
              onClick={() => {
                setRenameValue(node.name);
                setIsRenaming(true);
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteFile?.(node.id!)}
              className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

const FileExplorer = ({ 
  activeFile, 
  onFileSelect, 
  files, 
  folders,
  fileTree,
  loading, 
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onUploadZip,
}: FileExplorerProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewInput, setShowNewInput] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadAsZip = async () => {
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      
      files.forEach((file) => {
        zip.file(file.path, file.content);
      });
      
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "codesync-project.zip");
      
      toast({
        title: "Download Started",
        description: "Your project is being downloaded as a ZIP file.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error creating the ZIP file.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadZip) return;

    setIsUploading(true);

    try {
      const zip = await JSZip.loadAsync(file);
      const extractedFiles: { path: string; content: string }[] = [];
      const extractedFolders = new Set<string>();

      const promises: Promise<void>[] = [];

      zip.forEach((relativePath, zipEntry) => {
        // Skip hidden files and folders
        if (relativePath.startsWith(".") || relativePath.includes("/.")) return;
        // Skip node_modules
        if (relativePath.includes("node_modules")) return;

        if (zipEntry.dir) {
          // Remove trailing slash
          const folderPath = relativePath.endsWith("/") 
            ? relativePath.slice(0, -1) 
            : relativePath;
          if (folderPath) {
            extractedFolders.add(folderPath);
          }
        } else {
          promises.push(
            zipEntry.async("string").then((content) => {
              // Add parent folders
              const parts = relativePath.split("/");
              for (let i = 1; i < parts.length; i++) {
                extractedFolders.add(parts.slice(0, i).join("/"));
              }
              extractedFiles.push({ path: relativePath, content });
            })
          );
        }
      });

      await Promise.all(promises);

      // Sort folders by depth (parent first)
      const sortedFolders = Array.from(extractedFolders).sort(
        (a, b) => a.split("/").length - b.split("/").length
      );

      const success = await onUploadZip(extractedFiles, sortedFolders);

      if (success) {
        toast({
          title: "Upload Complete",
          description: `Imported ${extractedFiles.length} files and ${sortedFolders.length} folders.`,
        });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading zip:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error reading the ZIP file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateItem = () => {
    if (!newItemName.trim()) return;
    if (showNewInput === "file") {
      onCreateFile(newItemName.trim());
    } else if (showNewInput === "folder") {
      onCreateFolder(newItemName.trim(), null);
    }
    setNewItemName("");
    setShowNewInput(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateItem();
    } else if (e.key === "Escape") {
      setShowNewInput(null);
      setNewItemName("");
    }
  };

  const handleCreateFileInFolder = (name: string, folderPath?: string) => {
    // Pass just the file name and folder path - let the parent construct the full path
    onCreateFile(name, folderPath);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleUploadZip}
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group disabled:opacity-50"
            title="Upload ZIP"
          >
            <Upload className={`w-4 h-4 text-muted-foreground group-hover:text-codesync-lime transition-colors ${isUploading ? 'animate-pulse' : ''}`} />
          </button>
          <button 
            onClick={downloadAsZip}
            disabled={isDownloading || files.length === 0}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group disabled:opacity-50"
            title="Download as ZIP"
          >
            <Download className={`w-4 h-4 text-muted-foreground group-hover:text-codesync-purple transition-colors ${isDownloading ? 'animate-pulse' : ''}`} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group">
                <Plus className="w-4 h-4 text-muted-foreground group-hover:text-codesync-lime transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-background border border-white/10 z-50">
              <DropdownMenuItem
                onClick={() => setShowNewInput("file")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5" />
                New File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowNewInput("folder")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {showNewInput && (
        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
          {showNewInput === "folder" ? (
            <Folder className="w-4 h-4 text-purple-400" />
          ) : (
            <FileType className="w-4 h-4 text-muted-foreground" />
          )}
          <input
            type="text"
            placeholder={showNewInput === "folder" ? "folder name" : "filename.js"}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={() => {
              if (!newItemName.trim()) {
                setShowNewInput(null);
              }
            }}
            autoFocus
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-codesync-purple"
          />
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : fileTree.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No files yet</p>
        ) : (
          fileTree.map((node) => (
            <FileItem
              key={node.path}
              node={node}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onDeleteFile={onDeleteFile}
              onDeleteFolder={onDeleteFolder}
              onRenameFile={onRenameFile}
              onCreateFile={handleCreateFileInFolder}
              onCreateFolder={onCreateFolder}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;