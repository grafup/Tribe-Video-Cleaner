"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  className?: string;
  color?: "indigo" | "green" | "amber" | "red";
  animated?: boolean;
}

const colorMap = {
  indigo: "bg-indigo-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function ProgressBar({
  value,
  label,
  className,
  color = "indigo",
  animated = true,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            colorMap[color],
            animated && pct > 0 && pct < 100 && "animate-pulse-slow"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
