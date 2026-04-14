import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Room {
  id: string;
  room_code: string;
  created_by: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  is_active: boolean;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const CLEANUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes

export function useRoom(roomCode: string, createMode: boolean = false) {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  const cleanupScheduledRef = useRef<string | null>(null);

  // Generate a unique room code with retry logic
  const generateUniqueRoomCode = useCallback(async (): Promise<string> => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if code already exists
      const { data } = await supabase
        .from("rooms")
        .select("id")
        .eq("room_code", code)
        .maybeSingle();
      
      if (!data) {
        return code;
      }
      attempts++;
    }
    
    // Fallback: add timestamp suffix
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code + Date.now().toString(36).slice(-2).toUpperCase();
  }, []);

  // Create a new room with proper transaction-like behavior
  const createRoom = useCallback(async () => {
    if (!user || !roomCode) return null;

    try {
      // First check if room already exists
      const { data: existingRoom, error: checkError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRoom) {
        // Room exists, just join it
        setRoom(existingRoom);
        const { error: joinError } = await supabase
          .from("room_participants")
          .upsert(
            { room_id: existingRoom.id, user_id: user.id, is_active: true },
            { onConflict: "room_id,user_id" }
          );
        if (joinError) throw joinError;
        return existingRoom;
      }

      // Create new room
      const { data: newRoom, error: createError } = await supabase
        .from("rooms")
        .insert({ room_code: roomCode, created_by: user.id })
        .select()
        .single();

      if (createError) {
        // Handle duplicate key error - room was created by someone else
        if (createError.code === "23505") {
          const { data: createdRoom } = await supabase
            .from("rooms")
            .select("*")
            .eq("room_code", roomCode)
            .single();
          
          if (createdRoom) {
            setRoom(createdRoom);
            await supabase
              .from("room_participants")
              .upsert(
                { room_id: createdRoom.id, user_id: user.id, is_active: true },
                { onConflict: "room_id,user_id" }
              );
            return createdRoom;
          }
        }
        throw createError;
      }

      if (!newRoom) throw new Error("Failed to create room");

      setRoom(newRoom);

      // Join as participant
      const { error: joinError } = await supabase
        .from("room_participants")
        .upsert(
          { room_id: newRoom.id, user_id: user.id, is_active: true },
          { onConflict: "room_id,user_id" }
        );

      if (joinError) throw joinError;

      return newRoom;
    } catch (err: any) {
      console.error("Error creating room:", err);
      setError(err.message);
      return null;
    }
  }, [user, roomCode]);

  // Join an existing room only (for "Join Room" action)
  const joinRoom = useCallback(async () => {
    if (!user || !roomCode) return null;

    try {
      // Check if room exists
      const { data: existingRoom, error: fetchError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Room doesn't exist - return error
      if (!existingRoom) {
        setError("Room not found. Please check the room code or create a new room.");
        return null;
      }

      setRoom(existingRoom);

      // Join as participant (upsert to handle rejoining)
      const { error: joinError } = await supabase
        .from("room_participants")
        .upsert(
          { room_id: existingRoom.id, user_id: user.id, is_active: true },
          { onConflict: "room_id,user_id" }
        );

      if (joinError) throw joinError;

      return existingRoom;
    } catch (err: any) {
      console.error("Error joining room:", err);
      setError(err.message);
      return null;
    }
  }, [user, roomCode]);

  // Cleanup room if no active participants after delay
  const scheduleRoomCleanup = useCallback(async (roomId: string) => {
    // Prevent duplicate cleanup scheduling
    if (cleanupScheduledRef.current === roomId) return;
    cleanupScheduledRef.current = roomId;
    
    // Wait for the cleanup delay
    await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY_MS));

    try {
      // Check if any active participants remain
      const { data: activeParticipants, error: checkError } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", roomId)
        .eq("is_active", true);

      if (checkError) {
        console.error("Error checking participants:", checkError);
        cleanupScheduledRef.current = null;
        return;
      }

      // Delete room and associated data if no active participants
      if (!activeParticipants || activeParticipants.length === 0) {
        console.log("Cleaning up room:", roomId);
        
        // Delete in order due to foreign key constraints
        await supabase.from("messages").delete().eq("room_id", roomId);
        await supabase.from("files").delete().eq("room_id", roomId);
        await supabase.from("folders").delete().eq("room_id", roomId);
        await supabase.from("room_participants").delete().eq("room_id", roomId);
        await supabase.from("rooms").delete().eq("id", roomId);
        
        console.log("Room and all data deleted after 5 minutes of inactivity");
      }
    } catch (err) {
      console.error("Error during room cleanup:", err);
    } finally {
      cleanupScheduledRef.current = null;
    }
  }, []);

  // Leave room and schedule cleanup
  const leaveRoom = useCallback(async () => {
    if (!user || !room) return;

    const roomId = room.id;

    try {
      // Mark as inactive
      await supabase
        .from("room_participants")
        .update({ is_active: false })
        .eq("room_id", roomId)
        .eq("user_id", user.id);

      // Schedule cleanup after 5 minutes
      scheduleRoomCleanup(roomId);
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  }, [user, room, scheduleRoomCleanup]);

  // Fetch participants with fallback for foreign key issues
  const fetchParticipants = useCallback(async () => {
    if (!room) return;

    try {
      // Try with profile join first
      const { data, error } = await supabase
        .from("room_participants")
        .select(`
          id,
          user_id,
          is_active,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq("room_id", room.id)
        .eq("is_active", true);

      if (error) {
        // Fallback: fetch without profile join
        console.warn("Profile join failed, fetching without profiles:", error.message);
        const { data: basicData } = await supabase
          .from("room_participants")
          .select("id, user_id, is_active")
          .eq("room_id", room.id)
          .eq("is_active", true);
        
        if (basicData) {
          setParticipants(basicData.map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            is_active: p.is_active,
            profile: undefined,
          })));
        }
        return;
      }

      if (data) {
        const formatted = data.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          is_active: p.is_active,
          profile: p.profiles,
        }));
        setParticipants(formatted);
      }
    } catch (err) {
      console.error("Error fetching participants:", err);
    }
  }, [room]);

  // Initialize room on mount - use createMode to determine behavior
  useEffect(() => {
    // Prevent double initialization
    if (initRef.current) return;
    
    const init = async () => {
      if (!user || !roomCode) return;
      
      initRef.current = true;
      setLoading(true);
      setError(null);
      
      if (createMode) {
        await createRoom();
      } else {
        await joinRoom();
      }
      
      setLoading(false);
    };

    init();
  }, [user, roomCode, createMode, createRoom, joinRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room && user) {
        // Fire and forget - mark inactive on unmount
        supabase
          .from("room_participants")
          .update({ is_active: false })
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .then(() => {
            scheduleRoomCleanup(room.id);
          });
      }
    };
  }, [room, user, scheduleRoomCleanup]);

  // Fetch participants when room is set
  useEffect(() => {
    if (room) {
      fetchParticipants();
    }
  }, [room, fetchParticipants]);

  // Subscribe to participant changes
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-participants-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, fetchParticipants]);

  return {
    room,
    participants,
    loading,
    error,
    leaveRoom,
    createRoom,
    joinRoom,
    generateUniqueRoomCode,
    refetchParticipants: fetchParticipants,
  };
}
