"use client";

import { useSettingsStore } from "@/store/settings";
import { Slider } from "@/components/ui/Slider";

export function DoubleTakeSettings() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Double Take Detection</h2>
      <p className="text-xs text-gray-500">
        Detects repeated phrases and sentence restarts. Automatically selects
        the best take based on confidence and length.
      </p>

      <Slider
        label="Similarity threshold"
        displayValue={`${Math.round(settings.doubleTakeSensitivity * 100)}%`}
        min={0.4}
        max={0.99}
        step={0.01}
        value={[settings.doubleTakeSensitivity]}
        onValueChange={([v]) => updateSettings({ doubleTakeSensitivity: v })}
      />
      <p className="text-xs text-gray-500">
        Higher = only catch very similar repeated phrases. Lower = catch more
        (but may include false positives).
      </p>
    </div>
  );
}
