"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSettingsStore } from "@/store/settings";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

function SecretInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        label={label}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "sk-..."}
        hint={hint}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-[30px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ApiKeysSection() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">API Keys</h2>
      <p className="text-xs text-gray-500 -mt-3">
        Keys are stored in your browser only. Set them in{" "}
        <code className="font-mono">.env.local</code> to skip this step.
      </p>

      <SecretInput
        label="ElevenLabs API Key"
        value={settings.elevenlabsApiKey}
        onChange={(v) => updateSettings({ elevenlabsApiKey: v })}
        hint="Used for transcription when ElevenLabs is selected"
      />

      <SecretInput
        label="OpenAI API Key"
        value={settings.openaiApiKey}
        onChange={(v) => updateSettings({ openaiApiKey: v })}
        hint="Used for Whisper transcription and GPT analysis"
      />

      <SecretInput
        label="Anthropic API Key"
        value={settings.anthropicApiKey}
        onChange={(v) => updateSettings({ anthropicApiKey: v })}
        hint="Used for Claude analysis"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Default transcription provider
          </label>
          <Select
            value={settings.defaultTranscriptionProvider}
            onValueChange={(v) =>
              updateSettings({
                defaultTranscriptionProvider: v as "elevenlabs" | "openai",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              <SelectItem value="openai">OpenAI Whisper</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Default AI analysis provider
          </label>
          <Select
            value={settings.defaultAnalysisProvider}
            onValueChange={(v) =>
              updateSettings({
                defaultAnalysisProvider: v as "openai" | "anthropic",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI GPT</SelectItem>
              <SelectItem value="anthropic">Anthropic Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
