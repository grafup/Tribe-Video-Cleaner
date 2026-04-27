"use client";

import { useSettingsStore } from "@/store/settings";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export function SubtitleSettings() {
  const { settings, updateSettings } = useSettingsStore();
  const sub = settings.subtitleSettings;

  const update = (patch: Partial<typeof sub>) =>
    updateSettings({ subtitleSettings: { ...sub, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Subtitle Settings</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
          <Select
            value={sub.position}
            onValueChange={(v) =>
              update({ position: v as "bottom" | "middle" | "top" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="top">Top</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Slider
          label="Font size"
          displayValue={`${sub.fontSize}px`}
          min={12}
          max={72}
          step={1}
          value={[sub.fontSize]}
          onValueChange={([v]) => update({ fontSize: v })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Text color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={sub.primaryColor}
              onChange={(e) => update({ primaryColor: e.target.value })}
              className="h-9 w-12 rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 cursor-pointer"
            />
            <Input
              value={sub.primaryColor}
              onChange={(e) => update({ primaryColor: e.target.value })}
              className="flex-1 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Outline color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={sub.outlineColor}
              onChange={(e) => update({ outlineColor: e.target.value })}
              className="h-9 w-12 rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 cursor-pointer"
            />
            <Input
              value={sub.outlineColor}
              onChange={(e) => update({ outlineColor: e.target.value })}
              className="flex-1 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Slider
          label="Max words per line"
          displayValue={String(sub.maxWordsPerLine)}
          min={3}
          max={15}
          step={1}
          value={[sub.maxWordsPerLine]}
          onValueChange={([v]) => update({ maxWordsPerLine: v })}
        />

        <Slider
          label="Subtitle delay (seconds)"
          displayValue={`${sub.delaySeconds.toFixed(1)}s`}
          min={-2}
          max={2}
          step={0.1}
          value={[sub.delaySeconds]}
          onValueChange={([v]) => update({ delaySeconds: v })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Toggle
          label="Bold text"
          checked={sub.bold}
          onCheckedChange={(v) => update({ bold: v })}
        />
        <Toggle
          label="Uppercase"
          checked={sub.uppercase}
          onCheckedChange={(v) => update({ uppercase: v })}
        />
        <Toggle
          label="Export SRT file only (no burn-in)"
          checked={sub.exportSrtOnly}
          onCheckedChange={(v) => update({ exportSrtOnly: v, burnSubtitles: v ? false : sub.burnSubtitles })}
        />
        {!sub.exportSrtOnly && (
          <Toggle
            label="Burn subtitles into video"
            description="Permanently embed subtitles in the output file"
            checked={sub.burnSubtitles}
            onCheckedChange={(v) => update({ burnSubtitles: v })}
          />
        )}
      </div>
    </div>
  );
}
