"use client";

import { useSettingsStore } from "@/store/settings";
import { ApiKeysSection } from "@/components/settings/ApiKeysSection";
import { FillerWordsEditor } from "@/components/settings/FillerWordsEditor";
import { SilenceSettings } from "@/components/settings/SilenceSettings";
import { DoubleTakeSettings } from "@/components/settings/DoubleTakeSettings";
import { SubtitleSettings } from "@/components/settings/SubtitleSettings";
import { OutputSettings } from "@/components/settings/OutputSettings";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { RefreshCw } from "lucide-react";

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/30 p-6">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { resetSettings } = useSettingsStore();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Saved automatically in your browser.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetSettings();
            toast("Settings reset to defaults", { variant: "warning" });
          }}
          className="text-gray-500 dark:text-gray-400"
        >
          <RefreshCw className="h-4 w-4" />
          Reset to defaults
        </Button>
      </div>

      {/* API Keys — full width */}
      <Section>
        <ApiKeysSection />
      </Section>

      {/* Detection settings — three columns */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section>
          <FillerWordsEditor />
        </Section>
        <Section>
          <SilenceSettings />
        </Section>
        <Section>
          <DoubleTakeSettings />
        </Section>
      </div>

      {/* Output + subtitles side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section>
          <OutputSettings />
        </Section>
        <Section>
          <SubtitleSettings />
        </Section>
      </div>

      {/* Security note */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20 p-4 text-xs text-gray-500">
        <strong className="text-gray-700 dark:text-gray-400">API key security:</strong> Keys entered
        here are stored only in your browser&apos;s localStorage and sent directly
        to the API routes on your local server. They are never logged or shared.
        For production deployments, set{" "}
        <code className="font-mono text-gray-600 dark:text-gray-400">ELEVENLABS_API_KEY</code>,{" "}
        <code className="font-mono text-gray-600 dark:text-gray-400">OPENAI_API_KEY</code>, and{" "}
        <code className="font-mono text-gray-600 dark:text-gray-400">ANTHROPIC_API_KEY</code> as
        environment variables on your hosting platform instead.
      </div>
    </div>
  );
}
