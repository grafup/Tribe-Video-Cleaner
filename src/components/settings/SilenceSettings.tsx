"use client";

import { useSettingsStore } from "@/store/settings";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";

export function SilenceSettings() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Silence Detection</h2>

      <Slider
        label="Minimum silence length"
        displayValue={`${settings.silenceMinDuration.toFixed(1)}s`}
        min={0.2}
        max={5}
        step={0.1}
        value={[settings.silenceMinDuration]}
        onValueChange={([v]) => updateSettings({ silenceMinDuration: v })}
      />

      <Slider
        label="Padding before cut (keep natural lead-in)"
        displayValue={`${settings.silencePaddingBefore.toFixed(2)}s`}
        min={0}
        max={0.5}
        step={0.01}
        value={[settings.silencePaddingBefore]}
        onValueChange={([v]) => updateSettings({ silencePaddingBefore: v })}
      />

      <Slider
        label="Padding after cut (keep natural tail)"
        displayValue={`${settings.silencePaddingAfter.toFixed(2)}s`}
        min={0}
        max={0.5}
        step={0.01}
        value={[settings.silencePaddingAfter]}
        onValueChange={([v]) => updateSettings({ silencePaddingAfter: v })}
      />

      <Toggle
        label="Keep natural pauses"
        description="Don't cut pauses shorter than 0.3s even if above the threshold"
        checked={settings.keepNaturalPauses}
        onCheckedChange={(v) => updateSettings({ keepNaturalPauses: v })}
      />
    </div>
  );
}
