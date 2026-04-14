import { useEffect, useRef } from "react";

interface RemoteAudioPlayerProps {
  streams: Map<string, MediaStream>;
}

const RemoteAudioPlayer = ({ streams }: RemoteAudioPlayerProps) => {
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const currentPeerIds = new Set<string>();

    // Create/update audio elements for each stream
    streams.forEach((stream, peerId) => {
      currentPeerIds.add(peerId);
      let audioEl = audioElementsRef.current.get(peerId);

      if (!audioEl) {
        console.log("Creating audio element for peer:", peerId);
        audioEl = new Audio();
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        audioEl.volume = 1.0;
        audioElementsRef.current.set(peerId, audioEl);
      }

      if (audioEl.srcObject !== stream) {
        console.log("Setting stream for peer:", peerId, "tracks:", stream.getAudioTracks().length);
        audioEl.srcObject = stream;
        
        // Force play with retry
        const playAudio = () => {
          audioEl!.play().then(() => {
            console.log("Audio playing for peer:", peerId);
          }).catch((err) => {
            console.error("Audio play error for peer:", peerId, err);
            // Retry on user interaction
            const retryPlay = () => {
              audioEl?.play().catch(console.error);
              document.removeEventListener("click", retryPlay);
            };
            document.addEventListener("click", retryPlay, { once: true });
          });
        };
        
        playAudio();
      }
    });

    // Remove audio elements for disconnected peers
    audioElementsRef.current.forEach((audioEl, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        console.log("Removing audio element for peer:", peerId);
        audioEl.pause();
        audioEl.srcObject = null;
        audioElementsRef.current.delete(peerId);
      }
    });
  }, [streams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((audioEl) => {
        audioEl.pause();
        audioEl.srcObject = null;
      });
      audioElementsRef.current.clear();
    };
  }, []);

  // Hidden component - audio plays programmatically
  return null;
};

export default RemoteAudioPlayer;