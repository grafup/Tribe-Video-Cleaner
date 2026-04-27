"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/editor";
import { WordChip } from "./WordChip";
import { ContextMenu } from "./ContextMenu";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { WordSegment } from "@/types";

// ─── Sentence grouping ────────────────────────────────────────────────────────

function groupIntoSentences(words: WordSegment[]): WordSegment[][] {
  const sentences: WordSegment[][] = [];
  let current: WordSegment[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    current.push(w);

    const isEnd =
      w.text.match(/[.!?]$/) ||
      (i < words.length - 1 && words[i + 1].start - w.end > 1.0) ||
      i === words.length - 1;

    if (isEnd && current.length > 0) {
      sentences.push(current);
      current = [];
    }
  }
  if (current.length > 0) sentences.push(current);
  return sentences;
}

// ─── Double-take group label ──────────────────────────────────────────────────

function TakeGroupBadge({
  group,
  allWords,
}: {
  group: string;
  allWords: WordSegment[];
}) {
  const { setBestTake } = useEditorStore();
  const takes = allWords.filter((w) => w.takeGroup === group && w.takeNumber);
  const uniqueTakeNumbers = Array.from(new Set(takes.map((w) => w.takeNumber))).sort(
    (a, b) => (a ?? 0) - (b ?? 0)
  );

  if (uniqueTakeNumbers.length <= 1) return null;

  const bestTakeNum = takes.find((w) => w.isBestTake)?.takeNumber;

  return (
    <div className="flex items-center gap-2 mb-1 text-xs text-violet-600 dark:text-violet-400">
      <span className="font-semibold">Double take:</span>
      {uniqueTakeNumbers.map((num) => {
        const wordsInTake = takes.filter((w) => w.takeNumber === num);
        const isBest = num === bestTakeNum;
        const firstWord = wordsInTake[0];
        return (
          <button
            key={num}
            onClick={() => {
              if (firstWord) setBestTake(group, firstWord.id);
            }}
            className={cn(
              "rounded px-2 py-0.5 border transition-colors",
              isBest
                ? "border-green-500 bg-green-100 text-green-700 dark:border-green-600 dark:bg-green-900/40 dark:text-green-300"
                : "border-violet-400 bg-violet-50 text-violet-700 hover:border-violet-600 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:border-violet-500"
            )}
          >
            Take {num} {isBest ? "✓ best" : ""}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TranscriptEditor() {
  const { project, viewMode, setViewMode, clearSelection, undo, redo, canUndo, canRedo, resetAllStatus, applyAutoSuggestions } =
    useEditorStore();

  const transcript = project?.transcript ?? [];

  const sentences = useMemo(
    () => (viewMode === "sentence" ? groupIntoSentences(transcript) : null),
    [transcript, viewMode]
  );

  const seenTakeGroups = new Set<string>();

  if (transcript.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        Transcript will appear here after transcription
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative" onClick={clearSelection}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setViewMode("word")}
            className={cn(
              "px-3 py-1 text-sm transition-colors",
              viewMode === "word"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            Word
          </button>
          <button
            onClick={() => setViewMode("sentence")}
            className={cn(
              "px-3 py-1 text-sm transition-colors",
              viewMode === "sentence"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            Sentence
          </button>
        </div>

        <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
          ↩ Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
          ↪ Redo
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAllStatus}>
          Reset all
        </Button>
        <Button variant="secondary" size="sm" onClick={applyAutoSuggestions}>
          Apply suggestions
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 text-xs shrink-0">
        <span className="text-gray-500">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400 border border-amber-500 dark:bg-amber-500/60 dark:border-amber-600" />
          <span className="text-gray-600 dark:text-gray-400">Filler</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-400 border border-violet-500 dark:bg-violet-500/60 dark:border-violet-600" />
          <span className="text-gray-600 dark:text-gray-400">Double take</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-400 border border-blue-500 dark:bg-blue-500/60 dark:border-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Silence</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-400 border border-green-500 dark:bg-green-500/60 dark:border-green-600" />
          <span className="text-gray-600 dark:text-gray-400">Keep</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-400 border border-red-500 dark:bg-red-500/60 dark:border-red-600" />
          <span className="text-gray-600 dark:text-gray-400">Remove</span>
        </span>
      </div>

      {/* Transcript content */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-gray-100 dark:bg-gray-800/30 p-4 text-sm leading-loose">
        {viewMode === "word" ? (
          <div className="flex flex-wrap gap-x-1 gap-y-2 group">
            {transcript.map((seg) => {
              const showTakeBadge =
                seg.takeGroup && !seenTakeGroups.has(seg.takeGroup);
              if (seg.takeGroup) seenTakeGroups.add(seg.takeGroup);

              return (
                <span key={seg.id} className="inline-flex flex-col">
                  {showTakeBadge && (
                    <TakeGroupBadge
                      group={seg.takeGroup!}
                      allWords={transcript}
                    />
                  )}
                  <WordChip segment={seg} />
                </span>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sentences?.map((sentence, si) => {
              const start = sentence[0]?.start ?? 0;
              const dominated = sentence.reduce(
                (acc, w) => {
                  acc[w.type] = (acc[w.type] ?? 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              );
              const dominantType = Object.entries(dominated).sort(
                (a, b) => b[1] - a[1]
              )[0]?.[0];

              return (
                <div
                  key={si}
                  className={cn(
                    "rounded-lg p-3 border transition-colors",
                    dominantType === "filler"
                      ? "border-amber-400/50 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20"
                      : dominantType === "silence"
                      ? "border-blue-400/50 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/20"
                      : dominantType === "double_take"
                      ? "border-violet-400/50 bg-violet-50 dark:border-violet-700/50 dark:bg-violet-900/20"
                      : "border-gray-200 bg-white dark:border-gray-700/50 dark:bg-gray-800/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(start)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-1 gap-y-1 group">
                    {sentence.map((seg) => (
                      <WordChip key={seg.id} segment={seg} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ContextMenu />
    </div>
  );
}
