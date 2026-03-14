"use client";
import { Video } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loader2, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface VideoPlayerProps {
  video: Video;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [video.url]);

  if (video.status === "processing" || video.status === "pending") {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 aspect-video flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-orange-400" />
        <p className="text-sm text-gray-400">Generating your video...</p>
        <StatusBadge status={video.status} />
      </div>
    );
  }

  if (video.status === "failed") {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/20 aspect-video flex items-center justify-center">
        <p className="text-sm text-red-400">Video generation failed</p>
      </div>
    );
  }

  if (!video.url) return null;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-black relative group select-none">
      {/* Video — no controls, no right-click download */}
      <video
        ref={videoRef}
        src={video.url}
        className="w-full aspect-video"
        poster={video.thumbnail_url || undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v) setProgress(v.currentTime / (v.duration || 1));
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(v.duration);
        }}
        onEnded={() => setPlaying(false)}
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
      />

      {/* Click overlay for play/pause */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Center play icon when paused */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
            <Play size={20} className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Custom controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-white/20 rounded-full mb-2 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            const v = videoRef.current;
            if (v) { v.currentTime = pct * v.duration; setProgress(pct); }
          }}
        >
          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="text-white hover:text-orange-400 transition-colors">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={toggleMute} className="text-white hover:text-orange-400 transition-colors">
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <span className="text-xs text-gray-400 flex-1">
            {fmt(progress * duration)} / {fmt(duration)}
          </span>
          <button onClick={handleFullscreen} className="text-white hover:text-orange-400 transition-colors">
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
