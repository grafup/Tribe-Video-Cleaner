"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Film, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useEditorStore } from "@/store/editor";
import { useSettingsStore } from "@/store/settings";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Toggle } from "@/components/ui/Toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import type { RenderRequest, SSEEvent, AppSettings } from "@/types";

const QUALITY_LABELS: Record<AppSettings["outputQuality"], string> = {
  original: "Best (CRF 17, re-encode)",
  high: "High (CRF 18)",
  medium: "Medium (CRF 23)",
  small: "Small web (CRF 28, 720p)",
};

export function RenderPanel() {
  const { project, getSegmentsToKeep, renderJob, setRenderJob, updateRenderProgress } =
    useEditorStore();
  const { settings, updateSettings } = useSettingsStore();
  const [isStarting, setIsStarting] = useState(false);
  const evtSourceRef = useRef<EventSource | null>(null);
  const receivedDoneRef = useRef(false);

  useEffect(() => {
    return () => evtSourceRef.current?.close();
  }, []);

  const handleRender = async () => {
    if (!project) return;

    const keepSegments = getSegmentsToKeep();
    if (keepSegments.length === 0) {
      toast("Nothing to render", {
        description: "All segments are marked for removal.",
        variant: "error",
      });
      return;
    }

    setIsStarting(true);
    setRenderJob({ jobId: "", status: "queued", progress: 0 });

    try {
      const body: RenderRequest = {
        projectId: project.id,
        keepSegments,
        outputQuality: settings.outputQuality,
        generateSubtitles: settings.generateSubtitles,
        subtitleSettings: settings.subtitleSettings,
        transcript: project.transcript,
      };

      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Render failed");
      }

      const { jobId } = await res.json();
      receivedDoneRef.current = false;
      setRenderJob({ jobId, status: "rendering", progress: 0 });

      // Subscribe to SSE progress
      const evtSource = new EventSource(`/api/progress/${jobId}`);
      evtSourceRef.current = evtSource;

      evtSource.onmessage = (e) => {
        const event = JSON.parse(e.data) as SSEEvent;
        if (event.type === "progress") {
          updateRenderProgress(event.percent, "rendering");
        } else if (event.type === "done") {
          receivedDoneRef.current = true;
          updateRenderProgress(100, "done");
          setRenderJob({
            jobId,
            status: "done",
            progress: 100,
            outputUrl: event.outputUrl,
            srtUrl: event.srtUrl,
          });
          toast("Render complete!", { variant: "success" });
          evtSource.close();
        } else if (event.type === "error") {
          receivedDoneRef.current = true;
          setRenderJob({
            jobId,
            status: "error",
            progress: 0,
            error: event.message,
          });
          toast("Render failed", {
            description: event.message,
            variant: "error",
          });
          evtSource.close();
        }
      };

      evtSource.onerror = () => {
        // EventSource fires onerror whenever the server closes the stream —
        // including right after sending the done/error event. We can't trust
        // timing alone, so we poll the job status as a definitive fallback.
        setTimeout(async () => {
          if (receivedDoneRef.current) {
            evtSource.close();
            return;
          }
          try {
            const res = await fetch(`/api/progress/${jobId}?check=1`);
            if (res.ok) {
              const data = await res.json() as {
                status: string;
                progress: number;
                outputUrl: string | null;
                srtUrl: string | null;
                error: string | null;
              };
              if (data.status === "done" && data.outputUrl) {
                receivedDoneRef.current = true;
                updateRenderProgress(100, "done");
                setRenderJob({
                  jobId,
                  status: "done",
                  progress: 100,
                  outputUrl: data.outputUrl,
                  srtUrl: data.srtUrl ?? undefined,
                });
                toast("Render complete!", { variant: "success" });
                evtSource.close();
                return;
              }
              if (data.status === "error") {
                receivedDoneRef.current = true;
                setRenderJob({
                  jobId,
                  status: "error",
                  progress: 0,
                  error: data.error ?? "Render failed",
                });
                toast("Render failed", { description: data.error ?? undefined, variant: "error" });
                evtSource.close();
                return;
              }
            }
          } catch {
            // fetch failed — fall through to connection lost
          }
          setRenderJob({ jobId, status: "error", progress: 0, error: "Connection lost" });
          evtSource.close();
        }, 400);
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setRenderJob(null);
      toast("Render failed", { description: msg, variant: "error" });
    } finally {
      setIsStarting(false);
    }
  };

  const isRendering =
    renderJob?.status === "rendering" || renderJob?.status === "queued";
  const isDone = renderJob?.status === "done";
  const isError = renderJob?.status === "error";

  if (!project) return null;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <Film className="h-4 w-4 text-indigo-400" />
        Export
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Quality selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400">
            Output quality
          </label>
          <Select
            value={settings.outputQuality}
            onValueChange={(v) =>
              updateSettings({
                outputQuality: v as AppSettings["outputQuality"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QUALITY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subtitles */}
        <div className="flex flex-col gap-2 justify-end">
          <Toggle
            label="Generate subtitles (SRT)"
            checked={settings.generateSubtitles}
            onCheckedChange={(v) => updateSettings({ generateSubtitles: v })}
          />
          {settings.generateSubtitles && (
            <Toggle
              label="Burn subtitles into video"
              checked={settings.subtitleSettings.burnSubtitles}
              onCheckedChange={(v) =>
                updateSettings({
                  subtitleSettings: {
                    ...settings.subtitleSettings,
                    burnSubtitles: v,
                  },
                })
              }
            />
          )}
        </div>
      </div>

      {/* Progress */}
      {renderJob && (
        <div className="flex flex-col gap-2">
          {isRendering && (
            <ProgressBar
              value={renderJob.progress}
              label="Rendering..."
              color="indigo"
            />
          )}
          {isDone && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Render complete</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <XCircle className="h-4 w-4" />
              <span>{renderJob.error ?? "Render failed"}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleRender}
          disabled={isRendering || isStarting}
          loading={isStarting}
          className="gap-2"
        >
          {isRendering ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Film className="h-4 w-4" />
              {isDone ? "Re-render" : "Render cleaned video"}
            </>
          )}
        </Button>

        {isDone && renderJob?.outputUrl && (
          <>
            <Button
              variant="success"
              asChild
            >
              <a href={`${renderJob.outputUrl}?download=true`} download>
                <Download className="h-4 w-4" />
                Download video
              </a>
            </Button>
            {renderJob.srtUrl && (
              <Button variant="outline" asChild>
                <a href={`${renderJob.srtUrl}?download=true`} download>
                  <Download className="h-4 w-4" />
                  Download SRT
                </a>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
