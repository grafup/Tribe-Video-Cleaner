import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00.0";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ds = Math.floor((seconds % 1) * 10);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ds}`;
  }
  return `${m}:${String(s).padStart(2, "0")}.${ds}`;
}

export function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mergeTimeRanges(
  ranges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end + 0.01) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

export function resolveApiKey(
  envKey: string | undefined,
  headerKey: string | null | undefined
): string {
  return (envKey ?? "").trim() || (headerKey ?? "").trim();
}

export function getSegmentColor(
  type: string,
  status: string
): { bg: string; text: string; border: string } {
  if (status === "remove") {
    return {
      bg: "bg-red-100 dark:bg-red-950/50",
      text: "text-red-600 dark:text-red-400 line-through",
      border: "border-red-400 dark:border-red-700",
    };
  }
  if (status === "keep") {
    return {
      bg: "bg-green-100 dark:bg-green-950/50",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-500 dark:border-green-600",
    };
  }
  switch (type) {
    case "filler":
      return {
        bg: "bg-amber-100 dark:bg-amber-900/40",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-400 dark:border-amber-600",
      };
    case "silence":
      return {
        bg: "bg-blue-100 dark:bg-blue-900/40",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-400 dark:border-blue-600",
      };
    case "double_take":
      return {
        bg: "bg-violet-100 dark:bg-violet-900/40",
        text: "text-violet-700 dark:text-violet-300",
        border: "border-violet-400 dark:border-violet-600",
      };
    default:
      return {
        bg: "bg-transparent",
        text: "text-gray-800 dark:text-gray-200",
        border: "border-transparent",
      };
  }
}
