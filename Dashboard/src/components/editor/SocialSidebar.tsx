import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Send, Mic, MicOff, Phone, PhoneOff, User, Share2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { useAuth } from "@/contexts/AuthContext";
import RemoteAudioPlayer from "./RemoteAudioPlayer";
import { isValidAvatarUrl, MAX_MESSAGE_LENGTH } from "@/lib/validation";
import { toast } from "@/hooks/use-toast";
import { CollaboratorFile } from "@/hooks/useCollaboratorFiles";

interface FileNode {
  id: string;
  path: string;
  name: string;
}

interface SocialSidebarProps {
  roomId: string;
  roomCode: string;
  collaboratorFiles?: Map<string, CollaboratorFile>;
  onNavigateToFile?: (filePath: string, fileId: string) => void;
  files?: FileNode[];
}

const COLORS = ["#FF6B9D", "#4AE3B5", "#00D4FF", "#a855f7", "#FFD93D", "#6BCB77"];

const SocialSidebar = ({ roomId, roomCode, collaboratorFiles, onNavigateToFile, files }: SocialSidebarProps) => {
  const { user, profile } = useAuth();
  const { messages, sendMessage: sendChatMessage, loading: chatLoading } = useRoomChat(roomId);
  const { onlineUsers } = useRoomPresence(roomCode);
  const { 
    isMuted, 
    isConnected: voiceConnected, 
    remoteStreams,
    peerCount,
    startVoiceChat, 
    stopVoiceChat, 
    toggleMute 
  } = useVoiceChat(roomCode);
  
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const shareRoom = async () => {
    const shareUrl = `${window.location.origin}/editor/${roomCode}`;
    const shareData = {
      title: "Join my coding room on codesync IDE",
      text: `🚀 Let's code together!\n\nJoin my room: ${roomCode}\n\nClick to join:`,
      url: shareUrl,
    };

    // Check if Web Share API is available (primarily mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        if ((err as Error).name !== "AbortError") {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    const result = await sendChatMessage(message);
    if (result?.success) {
      setMessage("");
    } else if (result?.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  // Helper to get safe avatar URL
  const getSafeAvatarUrl = (url: string | null | undefined): string | null => {
    return url && isValidAvatarUrl(url) ? url : null;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceToggle = () => {
    if (voiceConnected) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getUserColor = (userId: string) => {
    const index = userId.charCodeAt(0) % COLORS.length;
    return COLORS[index];
  };

  const currentUsername = profile?.display_name || user?.email?.split("@")[0] || "You";

  return (
    <div className="h-full flex flex-col">
      {/* Remote Audio Player */}
      <RemoteAudioPlayer streams={remoteStreams} />
      
      {/* Room ID */}
      <div className="p-4 border-b border-white/10">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Room ID
        </label>
        <button
          onClick={shareRoom}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 border-dashed border-white/20 hover:border-codesync-purple/50 hover:bg-white/5 transition-all group"
        >
          <span className="font-mono text-lg tracking-widest text-foreground">{roomCode}</span>
          <div className="flex items-center gap-2">
            {copied ? (
              <Check className="w-4 h-4 text-codesync-lime" />
            ) : (
              <>
                {typeof navigator !== "undefined" && navigator.share ? (
                  <Share2 className="w-4 h-4 text-muted-foreground group-hover:text-codesync-purple transition-colors" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground group-hover:text-codesync-purple transition-colors" />
                )}
              </>
            )}
          </div>
        </button>
      </div>

      {/* Collaborators */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collaborators
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{onlineUsers.length} online</span>
            {voiceConnected && (
              <span className="text-xs text-codesync-lime">{peerCount + 1} in voice</span>
            )}
          </div>
        </div>
        
        {/* Voice Chat Controls */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant={voiceConnected ? "destructive" : "gradient"}
            size="sm"
            onClick={handleVoiceToggle}
            className="flex-1 gap-2"
          >
            {voiceConnected ? (
              <>
                <PhoneOff className="w-4 h-4" />
                Leave Voice
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Join Voice
              </>
            )}
          </Button>
          {voiceConnected && (
            <Button
              variant={isMuted ? "outline" : "default"}
              size="icon"
              onClick={toggleMute}
              className="h-9 w-9"
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
          {onlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              {user ? "Connecting..." : "Loading..."}
            </p>
          ) : (
            onlineUsers.map((collaborator, index) => {
              const isCurrentUser = collaborator.user_id === user?.id;
              const color = getUserColor(collaborator.user_id);
              const editingFile = collaboratorFiles?.get(collaborator.user_id);
              
              // Find file ID for navigation
              const handleFileClick = () => {
                if (editingFile && onNavigateToFile && files) {
                  const file = files.find(f => f.path === editingFile.filePath);
                  if (file) {
                    onNavigateToFile(editingFile.filePath, file.id);
                  }
                }
              };
              
              return (
                <motion.div
                  key={collaborator.user_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                      style={{ backgroundColor: color }}
                    >
                      {getSafeAvatarUrl(collaborator.avatar_url) ? (
                        <img
                          src={getSafeAvatarUrl(collaborator.avatar_url)!}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-codesync-lime border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {collaborator.display_name || "Anonymous"}
                      {isCurrentUser && " (You)"}
                    </p>
                    {editingFile && !isCurrentUser && (
                      <button
                        onClick={handleFileClick}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-codesync-purple transition-colors truncate"
                      >
                        <FileCode className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{editingFile.fileName}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chat
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {chatLoading ? (
            <p className="text-sm text-muted-foreground text-center">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">No messages yet. Say hi!</p>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isCurrentUser = msg.user_id === user?.id;
                const color = getUserColor(msg.user_id);
                const displayName = msg.profile?.display_name || "Anonymous";
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold"
                        style={{ color }}
                      >
                        {isCurrentUser ? currentUsername : displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {msg.content}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyPress={handleKeyPress}
              maxLength={MAX_MESSAGE_LENGTH}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-codesync-purple/50 transition-all"
            />
            <Button
              variant="gradient"
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="rounded-full w-10 h-10 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialSidebar;
