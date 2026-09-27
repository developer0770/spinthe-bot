import { useEffect, useRef } from 'react';
import { useRoomStore } from '../../store/roomStore';

export default function BackgroundPlayer() {
  const media = useRoomStore((s) => s.media);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!media) {
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    // calculate offset
    const timePassed = (Date.now() - media.startedAt) / 1000;

    if (media.track.type === 'AUDIO') {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) {
        audioRef.current.src = media.track.mediaUrl;
        audioRef.current.currentTime = timePassed;
        audioRef.current.play().catch(e => console.error('Audio playback failed', e));
      }
    } else if (media.track.type === 'VIDEO') {
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) {
        videoRef.current.src = media.track.mediaUrl;
        videoRef.current.currentTime = timePassed;
        videoRef.current.play().catch(e => console.error('Video playback failed', e));
      }
    }
  }, [media]);

  if (!media) return null;

  return (
    <>
      <audio ref={audioRef} />
      {media.track.type === 'VIDEO' && (
        <div className="fixed top-14 left-0 right-0 h-48 z-20 pointer-events-none bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover opacity-80"
            muted={false}
            playsInline
          />
        </div>
      )}
    </>
  );
}
