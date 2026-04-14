import { motion } from "framer-motion";
import { User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidAvatarUrl } from "@/lib/validation";

interface UserMenuProps {
  user: any;
  profile: any;
  navigate: (path: string) => void;
}

export const UserMenu = ({ user, profile, navigate }: UserMenuProps) => {
  const safeAvatarUrl = profile?.avatar_url && isValidAvatarUrl(profile.avatar_url) ? profile.avatar_url : null;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-6 right-6 z-50 pointer-events-auto"
    >
      {user ? (
        <button onClick={() => navigate("/profile")} className="flex items-center gap-3 px-4 py-2 rounded-full glass-card hover:bg-white/10 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
            {safeAvatarUrl ? <img src={safeAvatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white" />}
          </div>
          <span className="text-sm font-medium text-foreground">{displayName}</span>
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="flex items-center gap-2">
          <LogIn className="w-4 h-4" /> Sign In
        </Button>
      )}
    </motion.div>
  );
};