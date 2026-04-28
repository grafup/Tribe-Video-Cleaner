"use client";

import { useCallback, memo } from "react";
import { Check, X } from "lucide-react";
import { useEditorStore } from "@/store/editor";
import { getSegmentColor, formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { seekVideoTo } from "./VideoPreview";
import type { WordSegment } from "@/types";

interface WordChipProps {
  segment: WordSegment;
  isActive?: boolean;
}

function WordChipInner({ segment, isActive = false }: WordChipProps) {
  const { selectSegment, openContextMenu, selection, setSegmentStatus } =
    useEditorStore();
  const isSelected = selection.selectedSegmentIds.includes(segment.id);
  const colors = getSegmentColor(segment.type, segment.status);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectSegment(segment.id, e.metaKey || e.ctrlKey || e.shiftKey);
      // Move playhead to this word's timestamp on every click
      seekVideoTo(segment.start, false);
    },
    [segment.id, segment.start, selectSegment]
  );

  const handleDoubleClick = useCallback(() => {
    // Double-click: seek AND play
    seekVideoTo(segment.start, true);
  }, [segment.start]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(segment.id, { x: e.clientX, y: e.clientY });
    },
    [segment.id, openContextMenu]
  );

  const toggleStatus = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next =
        segment.status === "remove"
          ? "keep"
          : segment.status === "keep"
          ? "pending"
          : "remove";
      setSegmentStatus(segment.id, next);
    },
    [segment.id, segment.status, setSegmentStatus]
  );

  const isSilence = segment.type === "silence";

  if (isSilence) {
    return (
      <button
        data-segment-id={segment.id}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={`Silence ${formatTime(segment.start)} → ${formatTime(segment.end)}\nDouble-click to preview`}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs border cursor-pointer select-none transition-all",
          colors.bg,
          colors.text,
          colors.border,
          isSelected && "ring-2 ring-indigo-400",
          isActive && "ring-2 ring-indigo-500 brightness-110"
        )}
      >
        <span className="opacity-60">⏸</span>
        <span>{segment.text}</span>
        {segment.status === "remove" && <X className="h-3 w-3 text-red-500 dark:text-red-400" />}
        {segment.status === "keep" && (
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        )}
      </button>
    );
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        data-segment-id={segment.id}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={`${formatTime(segment.start)} → ${formatTime(segment.end)} (${Math.round(segment.confidence * 100)}%)\nDouble-click to preview`}
        className={cn(
          "rounded px-1 py-0.5 text-sm border cursor-pointer select-none transition-all",
          segment.type !== "normal"
            ? `${colors.bg} ${colors.border} border`
            : "border-transparent",
          colors.text,
          segment.status === "remove" && "line-through opacity-60",
          isSelected && "ring-2 ring-indigo-400",
          segment.isBestTake && "ring-2 ring-green-500",
          isActive && !isSelected && "ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-900/40"
        )}
      >
        {segment.text}
      </button>
      {/* Quick toggle dot */}
      {segment.type !== "normal" && (
        <button
          onClick={toggleStatus}
          className={cn(
            "absolute -top-1.5 -right-1 h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] transition-colors z-10",
            segment.status === "remove"
              ? "bg-red-500 text-white"
              : segment.status === "keep"
              ? "bg-green-500 text-white"
              : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100"
          )}
          title="Toggle keep/remove"
        >
          {segment.status === "remove" ? (
            <X className="h-2 w-2" />
          ) : segment.status === "keep" ? (
            <Check className="h-2 w-2" />
          ) : null}
        </button>
      )}
    </span>
  );
}

export const WordChip = memo(WordChipInner);
