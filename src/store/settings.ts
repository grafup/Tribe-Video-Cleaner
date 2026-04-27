import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { AppSettings } from "@/types";

const DEFAULT_FILLER_WORDS = [
  "um",
  "uh",
  "ah",
  "erm",
  "hmm",
  "like",
  "you know",
  "basically",
  "actually",
  "literally",
  "kind of",
  "sort of",
  "i mean",
  "well",
  "so",
];

export const DEFAULT_SETTINGS: AppSettings = {
  elevenlabsApiKey: "",
  openaiApiKey: "",
  anthropicApiKey: "",
  defaultTranscriptionProvider: "elevenlabs",
  defaultAnalysisProvider: "openai",
  fillerWords: DEFAULT_FILLER_WORDS,
  silenceMinDuration: 0.8,
  silencePaddingBefore: 0.1,
  silencePaddingAfter: 0.1,
  keepNaturalPauses: true,
  doubleTakeSensitivity: 0.75,
  outputQuality: "high",
  generateSubtitles: false,
  subtitleSettings: {
    fontSize: 24,
    fontFamily: "Arial",
    primaryColor: "#ffffff",
    outlineColor: "#000000",
    position: "bottom",
    bold: false,
    uppercase: false,
    maxWordsPerLine: 8,
    delaySeconds: 0,
    exportSrtOnly: false,
    burnSubtitles: false,
  },
};

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  addFillerWord: (word: string) => void;
  removeFillerWord: (word: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (patch) =>
        set((state) => {
          Object.assign(state.settings, patch);
        }),

      resetSettings: () =>
        set((state) => {
          state.settings = DEFAULT_SETTINGS;
        }),

      addFillerWord: (word) =>
        set((state) => {
          const normalized = word.toLowerCase().trim();
          if (normalized && !state.settings.fillerWords.includes(normalized)) {
            state.settings.fillerWords.push(normalized);
          }
        }),

      removeFillerWord: (word) =>
        set((state) => {
          state.settings.fillerWords = state.settings.fillerWords.filter(
            (w) => w !== word
          );
        }),
    })),
    {
      name: "ai-video-cleaner-settings",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
