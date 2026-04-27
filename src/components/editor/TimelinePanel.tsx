"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/editor";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Scissors, RefreshCw, CheckCheck, XCircle } from "lucide-react";

export function TimelinePanel() {
  const { project, setAllOfTypeStatus, resetAllStatus, applyAutoSuggestions } =
    useEditorStore();

  const transcript = project?.transcript ?? [];

  const stats = useMemo(() => {
    const fillers = transcript.filter((s) => s.type === "filler");
    const silences = transcript.filter((s) => s.type === "silence");
    const doubles = transcript.filter(
      (s) => s.type === "double_take" && !s.isBestTake
    );
    const toRemove = transcript.filter((s) => s.status === "remove");
    const savingsSec = toRemove.reduce((sum, s) => sum + (s.end - s.start), 0);

    return {
      fillerCount: fillers.length,
      silenceCount: silences.length,
      doubleCount: doubles.length,
      removeCount: toRemove.length,
      keepCount: transcript.filter((s) => s.status === "keep").length,
      savingsSec,
    };
  }, [transcript]);

  if (transcript.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Scissors className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          Cleanup Summary
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={resetAllStatus}>
            <RefreshCw className="h-3 w-3" />
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={applyAutoSuggestions}>
            Apply all suggestions
          </Button>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Filler words"
          count={stats.fillerCount}
          color="amber"
          onKeepAll={() => setAllOfTypeStatus("filler", "keep")}
          onRemoveAll={() => setAllOfTypeStatus("filler", "remove")}
        />
        <Stat
          label="Double takes"
          count={stats.doubleCount}
          color="violet"
          onKeepAll={() => setAllOfTypeStatus("double_take", "keep")}
          onRemoveAll={() => setAllOfTypeStatus("double_take", "remove")}
        />
        <Stat
          label="Silences"
          count={stats.silenceCount}
          color="blue"
          onKeepAll={() => setAllOfTypeStatus("silence", "keep")}
          onRemoveAll={() => setAllOfTypeStatus("silence", "remove")}
        />
        <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 p-3 flex flex-col gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Estimated savings</span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatTime(stats.savingsSec)}
          </span>
          <span className="text-xs text-gray-500">
            {stats.removeCount} segments removed
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  count,
  color,
  onKeepAll,
  onRemoveAll,
}: {
  label: string;
  count: number;
  color: "amber" | "violet" | "blue";
  onKeepAll: () => void;
  onRemoveAll: () => void;
}) {
  const colorMap = {
    amber: {
      dot: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-300 dark:border-amber-700/50",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    violet: {
      dot: "bg-violet-500",
      text: "text-violet-600 dark:text-violet-400",
      border: "border-violet-300 dark:border-violet-700/50",
      bg: "bg-violet-50 dark:bg-violet-900/20",
    },
    blue: {
      dot: "bg-blue-500",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-300 dark:border-blue-700/50",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
  }[color];

  return (
    <div
      className={`rounded-lg border ${colorMap.border} ${colorMap.bg} p-3 flex flex-col gap-2`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${colorMap.dot}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${colorMap.text}`}>{count}</span>
      <div className="flex gap-1">
        <button
          onClick={onKeepAll}
          className="flex-1 rounded px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center gap-1"
        >
          <CheckCheck className="h-2.5 w-2.5" />
          Keep all
        </button>
        <button
          onClick={onRemoveAll}
          className="flex-1 rounded px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-900/50 dark:text-gray-300 dark:hover:text-red-300 transition-colors flex items-center justify-center gap-1"
        >
          <XCircle className="h-2.5 w-2.5" />
          Cut all
        </button>
      </div>
    </div>
  );
}
