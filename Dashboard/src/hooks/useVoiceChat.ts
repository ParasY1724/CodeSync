import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate";
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

export function useVoiceChat(roomCode: string) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log("Creating peer connection for:", peerId);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "signaling",
          payload: {
            type: "ice-candidate",
            from: user?.id,
            to: peerId,
            payload: event.candidate.toJSON(),
          },
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track from:", peerId, "streams:", event.streams.length, "track:", event.track.kind);
      
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log("Setting remote stream for peer:", peerId, "audio tracks:", remoteStream.getAudioTracks().length);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerId, remoteStream);
          return next;
        });
      } else {
        // Handle track without streams (create new stream)
        console.log("Creating new stream for track from:", peerId);
        const newStream = new MediaStream([event.track]);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          const existingStream = next.get(peerId);
          if (existingStream) {
            existingStream.addTrack(event.track);
          } else {
            next.set(peerId, newStream);
          }
          return next;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId}:`, pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        removePeer(peerId);
      }
    };

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [user?.id]);

  // Remove peer
  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    }
  }, []);

  // Handle signaling message
  const handleSignalingMessage = useCallback(
    async (message: SignalingMessage) => {
      if (message.to !== user?.id) return;

      console.log("Received signaling:", message.type, "from:", message.from);

      let peer = peersRef.current.get(message.from);

      if (!peer && message.type === "offer") {
        const pc = createPeerConnection(message.from);
        peer = { peerId: message.from, connection: pc };
        peersRef.current.set(message.from, peer);
        setPeers(new Map(peersRef.current));
      }

      if (!peer) return;

      try {
        if (message.type === "offer") {
          await peer.connection.setRemoteDescription(
            new RTCSessionDescription(message.payload as RTCSessionDescriptionInit)
          );
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);

          channelRef.current?.send({
            type: "broadcast",
            event: "signaling",
            payload: {
              type: "answer",
              from: user?.id,
              to: message.from,
              payload: answer,
            },
          });
        } else if (message.type === "answer") {
          await peer.connection.setRemoteDescription(
            new RTCSessionDescription(message.payload as RTCSessionDescriptionInit)
          );
        } else if (message.type === "ice-candidate") {
          await peer.connection.addIceCandidate(
            new RTCIceCandidate(message.payload as RTCIceCandidateInit)
          );
        }
      } catch (error) {
        console.error("Signaling error:", error);
      }
    },
    [user?.id, createPeerConnection]
  );

  // Start voice chat
  const startVoiceChat = useCallback(async () => {
    if (!user || !roomCode) return;

    try {
      // Get local audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      
      // Mute by default
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      setIsConnected(true);
      console.log("Voice chat started");

      // Setup signaling channel
      const channel = supabase.channel(`voice-${roomCode}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "signaling" }, ({ payload }) => {
          handleSignalingMessage(payload as SignalingMessage);
        })
        .on("broadcast", { event: "user-joined" }, async ({ payload }) => {
          if (payload.userId !== user.id) {
            console.log("User joined voice:", payload.userId);
            // Create offer for new user
            const pc = createPeerConnection(payload.userId);
            const peer = { peerId: payload.userId, connection: pc };
            peersRef.current.set(payload.userId, peer);
            setPeers(new Map(peersRef.current));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channel.send({
              type: "broadcast",
              event: "signaling",
              payload: {
                type: "offer",
                from: user.id,
                to: payload.userId,
                payload: offer,
              },
            });
          }
        })
        .on("broadcast", { event: "user-left" }, ({ payload }) => {
          if (payload.userId !== user.id) {
            console.log("User left voice:", payload.userId);
            removePeer(payload.userId);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // Announce joining
            channel.send({
              type: "broadcast",
              event: "user-joined",
              payload: { userId: user.id },
            });
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error("Error starting voice chat:", error);
    }
  }, [user, roomCode, createPeerConnection, handleSignalingMessage, removePeer]);

  // Stop voice chat
  const stopVoiceChat = useCallback(() => {
    // Announce leaving
    if (channelRef.current && user) {
      channelRef.current.send({
        type: "broadcast",
        event: "user-left",
        payload: { userId: user.id },
      });
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    setPeers(new Map());
    setRemoteStreams(new Map());

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
    setIsMuted(true);
  }, [user]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, [stopVoiceChat]);

  return {
    isMuted,
    isConnected,
    remoteStreams,
    peerCount: peers.size,
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
  };
}
