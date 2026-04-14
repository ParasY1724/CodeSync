import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeRoomCode, isValidRoomCode } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import FloatingBlobs from "@/components/FloatingBlobs";
import { UserMenu } from "@/components/lobby/UserMenu";
import { HeroSection } from "@/components/lobby/HeroSection";
import { HeroScrollDemo } from "@/components/lobby/HeroScrollDemo";
import { AboutSection } from "@/components/lobby/AboutSection";
import { BlogSection } from "@/components/lobby/BlogSection";
import { FeaturesGrid } from "@/components/lobby/FeaturesGrid";
import { FaqSection } from "@/components/lobby/FaqSection";
import { Footer } from "@/components/lobby/Footer";

const Lobby = () => {
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(id);
    return id;
  };

  const handleCreateRoom = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const newRoomId = generateRoomId();
    navigate(`/editor/${newRoomId}?create=true`);
  };

  const handleJoinRoom = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!roomId.trim() || !isValidRoomCode(roomId)) return;
    setJoining(true);
    try {
      const { data: existingRoom } = await supabase.from("rooms").select("id").eq("room_code", roomId).maybeSingle();
      if (!existingRoom) {
        toast.error("Room not found");
        setJoining(false);
        return;
      }
      navigate(`/editor/${roomId}`);
    } catch (err) {
      toast.error("Failed to join room");
      setJoining(false);
    }
  };

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => setRoomId(sanitizeRoomCode(e.target.value));
  
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    // pointer-events-none lets clicks pass through empty spaces to FloatingBlobs
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-transparent pointer-events-none">
      
      {/* Background */}
      <FloatingBlobs />

      {/* Navigation */}
      <UserMenu user={user} profile={profile} navigate={navigate} />

      {/* Main Sections */}
      <HeroSection 
        user={user}
        profile={profile}
        navigate={navigate}
        roomId={roomId}
        setRoomId={(val) => setRoomId(sanitizeRoomCode(val))}
        handleCreateRoom={handleCreateRoom}
        handleJoinRoom={handleJoinRoom}
        copyRoomId={copyRoomId}
        copied={copied}
      />

      <HeroScrollDemo />
      <AboutSection />
      <FeaturesGrid />
      <BlogSection />
      <FaqSection />
      <Footer />
      
    </div>
  );
};

export default Lobby;