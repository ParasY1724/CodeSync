import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeMessage, isValidMessage, MAX_MESSAGE_LENGTH } from "@/lib/validation";

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useRoomChat(roomId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilesCache, setProfilesCache] = useState<Map<string, { display_name: string | null; avatar_url: string | null }>>(new Map());

  // Fetch profile for a user
  const fetchProfile = useCallback(async (userId: string) => {
    if (profilesCache.has(userId)) {
      return profilesCache.get(userId);
    }

    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", userId)
      .single();

    if (data) {
      setProfilesCache((prev) => new Map(prev).set(userId, data));
      return data;
    }
    return null;
  }, [profilesCache]);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from("messages")
      .select("id, content, user_id, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      setLoading(false);
      return;
    }

    if (data) {
      // Fetch profiles for all unique users
      const userIds = [...new Set(data.map((m) => m.user_id))];
      const profiles = new Map<string, { display_name: string | null; avatar_url: string | null }>();

      await Promise.all(
        userIds.map(async (userId) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", userId)
            .single();
          if (profile) {
            profiles.set(userId, profile);
          }
        })
      );

      setProfilesCache(profiles);

      const formatted = data.map((m) => ({
        id: m.id,
        content: m.content,
        user_id: m.user_id,
        created_at: m.created_at,
        profile: profiles.get(m.user_id) || null,
      }));
      setMessages(formatted);
    }
    setLoading(false);
  }, [roomId]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !roomId) return { success: false, error: "Not authenticated" };
      
      const sanitizedContent = sanitizeMessage(content);
      if (!isValidMessage(sanitizedContent)) {
        return { success: false, error: `Message must be 1-${MAX_MESSAGE_LENGTH} characters` };
      }

      const { error } = await supabase.from("messages").insert({
        room_id: roomId,
        user_id: user.id,
        content: sanitizedContent,
      });

      if (error) {
        console.error("Error sending message:", error);
        return { success: false, error: "Failed to send message" };
      }
      
      return { success: true };
    },
    [user, roomId]
  );

  // Initialize
  useEffect(() => {
    if (roomId) {
      fetchMessages();
    }
  }, [roomId, fetchMessages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            content: string;
            user_id: string;
            created_at: string;
          };

          // Get or fetch profile
          let profile = profilesCache.get(newMessage.user_id);
          if (!profile) {
            profile = await fetchProfile(newMessage.user_id) || undefined;
          }

          const formatted = {
            id: newMessage.id,
            content: newMessage.content,
            user_id: newMessage.user_id,
            created_at: newMessage.created_at,
            profile,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === formatted.id)) return prev;
            return [...prev, formatted];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, profilesCache, fetchProfile]);

  return {
    messages,
    loading,
    sendMessage,
  };
}
