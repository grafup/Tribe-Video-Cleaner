"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, Volume2, SkipBack, SkipForward } from "lucide-react";
import { useEditorStore } from "@/store/editor";
import { mergeTimeRanges, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  src: string;
  className?: string;
}

export function VideoPreview({ src, className }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    currentTime,
    duration,
    isPlaying,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    project,
  } = useEditorStore();

  // Build merged remove ranges from the current transcript decisions
  const removeRanges = useMemo(() => {
    if (!project) return [];
    const removed = project.transcript
      .filter((s) => s.status === "remove")
      .map((s) => ({ start: s.start, end: s.end }));
    return mergeTimeRanges(removed);
  }, [project]);

  // Sync video element events → store
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("loadedmetadata", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("loadedmetadata", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [setCurrentTime, setDuration, setIsPlaying]);

  // Skip over removed segments during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || removeRanges.length === 0) return;

    const handleSkip = () => {
      const t = video.currentTime;
      for (const range of removeRanges) {
        if (t >= range.start && t < range.end) {
          video.currentTime = range.end;
          return;
        }
      }
    };

    video.addEventListener("timeupdate", handleSkip);
    return () => video.removeEventListener("timeupdate", handleSkip);
  }, [removeRanges]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
  }, []);

  const skip = useCallback(
    (delta: number) => seekTo(currentTime + delta),
    [currentTime, seekTo]
  );

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => seekTo(Number(e.target.value)),
    [seekTo]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("flex flex-col rounded-xl overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video object-contain bg-black"
        preload="metadata"
        onClick={togglePlay}
      />
      <div className="bg-gray-100 dark:bg-gray-900 px-3 py-2 flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.05}
          value={currentTime}
          onChange={handleScrub}
          className="w-full accent-indigo-500 cursor-pointer h-1.5"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => skip(-5)} title="Back 5s">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => skip(5)} title="Forward 5s">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
      <div className="h-1 bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-indigo-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Seek without auto-play — used by single click on a word
export function seekVideoTo(time: number, andPlay = false) {
  const video = document.querySelector<HTMLVideoElement>("video");
  if (!video) return;
  video.currentTime = time;
  if (andPlay) video.play().catch(() => {});
}
