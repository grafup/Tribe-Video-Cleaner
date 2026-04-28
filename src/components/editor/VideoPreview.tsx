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

  // Skip removed segments during playback using precise setTimeout scheduling.
  // timeupdate (~4 Hz) is too coarse — it lets 100–200 ms of audio play before
  // detecting the range boundary. Instead we schedule a timeout to fire right
  // as the playhead reaches each removed range.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let skipTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearSkip = () => {
      if (skipTimeout !== null) {
        clearTimeout(skipTimeout);
        skipTimeout = null;
      }
    };

    const scheduleNextSkip = () => {
      clearSkip();
      if (video.paused || removeRanges.length === 0) return;

      const t = video.currentTime;

      // Already inside a removed range → jump out immediately
      for (const range of removeRanges) {
        if (t >= range.start && t < range.end) {
          video.currentTime = range.end;
          // play() ensures video resumes if the browser briefly pauses during seek;
          // the resulting 'play' event will re-trigger scheduleNextSkip
          video.play().catch(() => {});
          return;
        }
      }

      // Find the nearest upcoming removed range
      let nearest: { start: number; end: number } | null = null;
      for (const range of removeRanges) {
        if (range.start > t && (!nearest || range.start < nearest.start)) {
          nearest = range;
        }
      }

      if (nearest) {
        const rate = video.playbackRate || 1;
        const msUntil = ((nearest.start - t) / rate) * 1000;
        const captured = nearest;
        // Fire 30 ms early to compensate for JS event-loop latency
        skipTimeout = setTimeout(() => {
          if (!video.paused) {
            video.currentTime = captured.end;
            video.play().catch(() => {});
          }
        }, Math.max(0, msUntil - 30));
      }
    };

    const onPlay = () => scheduleNextSkip();
    const onPause = () => clearSkip();
    const onSeeked = () => { if (!video.paused) scheduleNextSkip(); };
    const onRateChange = () => { clearSkip(); if (!video.paused) scheduleNextSkip(); };
    const onEnded = () => clearSkip();

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ratechange", onRateChange);
    video.addEventListener("ended", onEnded);

    // If already playing when removeRanges change, reschedule immediately
    if (!video.paused) scheduleNextSkip();

    return () => {
      clearSkip();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ratechange", onRateChange);
      video.removeEventListener("ended", onEnded);
    };
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
