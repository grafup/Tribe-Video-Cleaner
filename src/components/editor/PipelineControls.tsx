"use client";

import { useState, useCallback } from "react";
import { Mic, Sparkles, AudioLines } from "lucide-react";
import { useEditorStore } from "@/store/editor";
import { useSettingsStore } from "@/store/settings";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { UploadArea } from "./UploadArea";
import { DEFAULT_SETTINGS } from "@/store/settings";
import type { AppSettings, Project, WordSegment } from "@/types";

function buildApiHeaders(settings: AppSettings): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-elevenlabs-key": settings.elevenlabsApiKey,
    "x-openai-key": settings.openaiApiKey,
    "x-anthropic-key": settings.anthropicApiKey,
  };
}

export function PipelineControls() {
  const {
    project,
    pipeline,
    setPipelineStep,
    setPipelineError,
    clearPipelineError,
    setProject,
  } = useEditorStore();
  const { settings } = useSettingsStore();

  const [transcriptionProvider, setTranscriptionProvider] = useState<
    "elevenlabs" | "openai"
  >(settings.defaultTranscriptionProvider);
  const [analysisProvider, setAnalysisProvider] = useState<
    "openai" | "anthropic"
  >(settings.defaultAnalysisProvider);
  const [runAiAnalysis, setRunAiAnalysis] = useState(true);

  // ─── Step 1: Upload only ───────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      clearPipelineError();
      setPipelineStep("uploading", 10);

      try {
        const form = new FormData();
        form.append("video", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error ?? "Upload failed");
        }
        const { projectId, videoUrl, videoPath } = await res.json();

        // Create a minimal project immediately — video is now playable
        const partialProject: Project = {
          id: projectId,
          name: file.name,
          videoPath,
          videoUrl,
          durationSeconds: 0,
          transcript: [],
          settings: { ...DEFAULT_SETTINGS, ...settings },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProject(partialProject);

        // Override the 'ready' step that setProject sets — signal we're in the
        // uploaded-but-not-yet-transcribed state
        setPipelineStep("uploaded", 100);
        toast("Video ready", { description: "Choose a provider and click Transcribe.", variant: "success" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setPipelineError(msg);
        toast("Upload failed", { description: msg, variant: "error" });
      }
    },
    [settings, setPipelineStep, setPipelineError, clearPipelineError, setProject]
  );

  // ─── Step 2: Extract audio + transcribe + analyze ──────────────────────────

  const handleTranscribe = useCallback(async () => {
    if (!project) return;
    clearPipelineError();
    setPipelineStep("extracting", 20);

    try {
      // Extract audio
      const audioRes = await fetch("/api/extract-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPath: project.videoPath,
          projectId: project.id,
        }),
      });
      if (!audioRes.ok) {
        const e = await audioRes.json();
        throw new Error(e.error ?? "Audio extraction failed");
      }
      const { audioPath, durationSeconds } = await audioRes.json();

      setPipelineStep("transcribing", 45);

      // Transcribe
      const txRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: buildApiHeaders(settings),
        body: JSON.stringify({
          audioPath,
          provider: transcriptionProvider,
          projectId: project.id,
        }),
      });
      if (!txRes.ok) {
        const e = await txRes.json();
        throw new Error(e.error ?? "Transcription failed");
      }
      const { transcript: rawTranscript } = await txRes.json();

      let finalTranscript: WordSegment[] = rawTranscript;

      if (runAiAnalysis) {
        setPipelineStep("analyzing", 75);

        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: buildApiHeaders(settings),
          body: JSON.stringify({
            transcript: rawTranscript,
            provider: analysisProvider,
            settings,
          }),
        });
        if (analyzeRes.ok) {
          const { transcript: analyzed } = await analyzeRes.json();
          finalTranscript = analyzed;
        } else {
          console.warn("[analyze] failed — using local detection only");
        }
      }

      // Update the project with transcript + real duration
      setProject({
        ...project,
        audioPath,
        durationSeconds: durationSeconds || project.durationSeconds,
        transcript: finalTranscript,
        updatedAt: new Date().toISOString(),
      });

      toast("Transcription complete!", {
        description: `${finalTranscript.length} words detected`,
        variant: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed";
      setPipelineError(msg);
      setPipelineStep("uploaded", 100); // allow retry
      toast("Error", { description: msg, variant: "error" });
    }
  }, [
    project,
    settings,
    transcriptionProvider,
    analysisProvider,
    runAiAnalysis,
    setPipelineStep,
    setPipelineError,
    clearPipelineError,
    setProject,
  ]);

  // ─── Derived state ─────────────────────────────────────────────────────────

  const step = pipeline.step;
  const isIdle = step === "idle";
  const isUploading = step === "uploading";
  const isUploaded = step === "uploaded";
  const isReady = step === "ready";
  const isBusy =
    step === "extracting" || step === "transcribing" || step === "analyzing";

  const stepLabel: Record<string, string> = {
    uploading: "Uploading video...",
    extracting: "Extracting audio...",
    transcribing: "Transcribing...",
    analyzing: "Analyzing...",
  };

  const providerSelectors = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5" />
          Transcription
        </label>
        <Select
          value={transcriptionProvider}
          onValueChange={(v) => setTranscriptionProvider(v as "elevenlabs" | "openai")}
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
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          AI analysis
        </label>
        <Select
          value={runAiAnalysis ? analysisProvider : "none"}
          onValueChange={(v) => {
            if (v === "none") setRunAiAnalysis(false);
            else {
              setRunAiAnalysis(true);
              setAnalysisProvider(v as "openai" | "anthropic");
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI GPT</SelectItem>
            <SelectItem value="anthropic">Anthropic Claude</SelectItem>
            <SelectItem value="none">Local detection only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Idle — show upload dropzone */}
      {(isIdle || isUploading) && (
        <div className="flex flex-col gap-4">
          <UploadArea onFile={handleUpload} disabled={isUploading} />

          {isUploading && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <AudioLines className="h-4 w-4 text-indigo-500 animate-pulse" />
                Uploading video...
              </div>
              <ProgressBar value={pipeline.progress} color="indigo" animated />
            </div>
          )}
        </div>
      )}

      {/* Uploaded — video is visible, ready to transcribe */}
      {(isUploaded || isReady) && (
        <div className="flex flex-col gap-3">
          {providerSelectors}

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleTranscribe}
              className="flex-1 sm:flex-none gap-2"
            >
              <Mic className="h-4 w-4" />
              {isReady ? "Re-transcribe" : "Transcribe"}
            </Button>

            {/* Allow uploading a different file */}
            <Button
              variant="outline"
              onClick={() => document.getElementById("swap-video-input")?.click()}
            >
              Change video
            </Button>
            <input
              id="swap-video-input"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {/* Processing — show animated progress */}
      {isBusy && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <AudioLines className="h-4 w-4 text-indigo-500 animate-pulse" />
            {stepLabel[step] ?? "Processing..."}
          </div>
          <ProgressBar value={pipeline.progress} color="indigo" animated />
        </div>
      )}

      {/* Error */}
      {pipeline.error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-300">
          {pipeline.error}
        </div>
      )}
    </div>
  );
}
