import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Code2, ArrowLeft, User, Mail, Camera, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import FloatingBlobs from "@/components/FloatingBlobs";
import { 
  sanitizeDisplayName, 
  sanitizeAvatarUrl, 
  isValidAvatarUrl,
  MAX_DISPLAY_NAME_LENGTH, 
  MAX_AVATAR_URL_LENGTH 
} from "@/lib/validation";
import { getSafeProfileMessage } from "@/lib/authErrors";

const Profile = () => {
  const { user, profile, signOut, refreshProfile, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    
    // Validate avatar URL before saving
    if (avatarUrl && !isValidAvatarUrl(avatarUrl)) {
      toast({
        title: "Invalid Avatar URL",
        description: "Please enter a valid http/https URL or leave empty.",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    try {
      const sanitizedName = sanitizeDisplayName(displayName);
      const sanitizedAvatar = sanitizeAvatarUrl(avatarUrl);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: sanitizedName,
          avatar_url: sanitizedAvatar || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Profile updated!",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: getSafeProfileMessage(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Safe avatar URL for preview
  const safeAvatarUrl = isValidAvatarUrl(avatarUrl) ? avatarUrl : '';

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <FloatingBlobs />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8 z-10"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="p-1 ">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">CodeSync</span>
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Your Profile
        </h1>
        <p className="text-muted-foreground">
          Customize how you appear to other collaborators
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-md glass-card p-8 z-10"
      >
        {/* Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center overflow-hidden">
              {safeAvatarUrl ? (
                <img
                  src={safeAvatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-secondary border border-white/10">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={user?.email || ""}
                className="glow-input w-full pl-12 opacity-60 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Your display name..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, MAX_DISPLAY_NAME_LENGTH))}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                className="glow-input w-full pl-12"
              />
            </div>
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Avatar URL
            </label>
            <div className="relative">
              <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="url"
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value.slice(0, MAX_AVATAR_URL_LENGTH))}
                maxLength={MAX_AVATAR_URL_LENGTH}
                className="glow-input w-full pl-12"
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>

          {/* Sign Out Button */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
