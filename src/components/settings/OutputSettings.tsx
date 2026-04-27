"use client";

import { useSettingsStore } from "@/store/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { AppSettings } from "@/types";

const PRESETS: Array<{ value: AppSettings["outputQuality"]; label: string; desc: string }> = [
  { value: "original", label: "Original quality", desc: "Stream copy — fastest, no re-encode" },
  { value: "high", label: "High (CRF 18)", desc: "Visually lossless, ~2× file size reduction" },
  { value: "medium", label: "Medium (CRF 23)", desc: "Good quality, balanced size" },
  { value: "small", label: "Small web (CRF 28 + 720p)", desc: "Smallest file, optimized for web" },
];

export function OutputSettings() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Output Quality</h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Export quality preset
        </label>
        <Select
          value={settings.outputQuality}
          onValueChange={(v) =>
            updateSettings({ outputQuality: v as AppSettings["outputQuality"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30 p-3">
        {PRESETS.map((p) => (
          <div
            key={p.value}
            className={`flex items-start gap-2 py-1.5 ${
              p.value === settings.outputQuality
                ? "text-indigo-600 dark:text-indigo-300"
                : "text-gray-500"
            }`}
          >
            <span className="text-xs font-mono mt-0.5">
              {p.value === settings.outputQuality ? "→" : " "}
            </span>
            <div>
              <span className="text-xs font-medium">{p.label}</span>
              <span className="text-xs ml-2 opacity-70">{p.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
