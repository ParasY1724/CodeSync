import { motion } from "framer-motion";
import { Code2, Users, Sparkles, LogIn, Check, Copy, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidAvatarUrl } from "@/lib/validation";

interface HeroSectionProps {
  user: any;
  profile: any;
  navigate: (path: string) => void;
  roomId: string;
  setRoomId: (id: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: () => void;
  copyRoomId: () => void;
  copied: boolean;
}

export const HeroSection = ({
  user,
  profile,
  navigate,
  roomId,
  setRoomId,
  handleCreateRoom,
  handleJoinRoom,
  copyRoomId,
  copied
}: HeroSectionProps) => {
  
  const safeAvatarUrl = profile?.avatar_url && isValidAvatarUrl(profile.avatar_url) ? profile.avatar_url : null;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      
      {/* Title Area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-12 pointer-events-auto"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="p-3 pr-0"><Code2 className="w-8 h-8 " /></div>
          <span className="text-2xl font-bold gradient-text">CodeSync</span>
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
          Code Together,<br /><span className="gradient-text">Create Forever.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Real-time collaborative coding with your team. Share ideas, write code, and build amazing things together.
        </p>
      </motion.div>

      {/* Features Pills */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-3 mb-12 pointer-events-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {[{ icon: Users, text: "Live Collaboration" }, { icon: Sparkles, text: "Real-time Sync" }, { icon: Code2, text: "Multi-language Support" }].map((feature, index) => (
          <motion.div key={feature.text} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card">
            <feature.icon className="w-4 h-4 text-codesync-purple" />
            <span className="text-sm text-foreground">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Join Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        className="w-full max-w-md glass-card p-8 float-hover pointer-events-auto"
      >
        <div className="space-y-6">
          {user ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
              {safeAvatarUrl ? <img src={safeAvatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div><p className="text-sm font-medium text-foreground">{displayName}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
            </div>
          ) : (
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-muted-foreground mb-3">Sign in to create or join rooms</p>
              <Button variant="gradient" size="sm" onClick={() => navigate("/auth")}><LogIn className="w-4 h-4 mr-2" /> Sign In</Button>
            </div>
          )}
          {user && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Room ID (optional)</label>
              <div className="relative">
                <input type="text" placeholder="Enter room ID to join..." value={roomId} onChange={(e) => setRoomId(e.target.value)} maxLength={20} className="glow-input w-full pr-12 uppercase tracking-widest font-mono" />
                {roomId && (
                  <button onClick={copyRoomId} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors">
                    {copied ? <Check className="w-4 h-4 text-codesync-lime" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                )}
              </div>
            </div>
          )}
          {user && (
            <div className="flex gap-4">
              <Button variant="gradient" size="lg" className="flex-1" onClick={handleCreateRoom}>Create Room <Sparkles className="w-4 h-4" /></Button>
              <Button variant="outline" size="lg" className="flex-1" onClick={handleJoinRoom} disabled={!roomId.trim()}>Join Room <ArrowRight className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </motion.div>
      
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1 }} className="mt-8 text-sm text-muted-foreground animate-bounce pointer-events-auto">
        Scroll down to learn more
      </motion.p>
    </div>
  );
};