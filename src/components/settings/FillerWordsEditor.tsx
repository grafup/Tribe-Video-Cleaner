"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useSettingsStore } from "@/store/settings";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function FillerWordsEditor() {
  const { settings, addFillerWord, removeFillerWord } = useSettingsStore();
  const [newWord, setNewWord] = useState("");

  const handleAdd = () => {
    if (!newWord.trim()) return;
    addFillerWord(newWord.trim());
    setNewWord("");
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Filler Words</h2>
      <p className="text-xs text-gray-500">
        Words and phrases to highlight in amber. Case-insensitive.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="Add filler word or phrase..."
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} size="default">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30 p-3 min-h-[60px]">
        {settings.fillerWords.length === 0 ? (
          <span className="text-sm text-gray-500">No filler words configured</span>
        ) : (
          settings.fillerWords.map((word) => (
            <span
              key={word}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 border border-amber-300 px-2.5 py-1 text-sm text-amber-700 dark:bg-amber-900/40 dark:border-amber-700/50 dark:text-amber-300"
            >
              {word}
              <button
                onClick={() => removeFillerWord(word)}
                className="hover:text-amber-900 dark:hover:text-white transition-colors"
                aria-label={`Remove "${word}"`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
