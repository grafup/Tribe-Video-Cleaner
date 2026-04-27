"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/store/editor";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { TranscriptEditor } from "@/components/editor/TranscriptEditor";
import { TimelinePanel } from "@/components/editor/TimelinePanel";
import { RenderPanel } from "@/components/editor/RenderPanel";
import { PipelineControls } from "@/components/editor/PipelineControls";
import { Button } from "@/components/ui/Button";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import type { Project } from "@/types";

export default function EditorPage() {
  const { project, setProject, clearProject } = useEditorStore();
  const hasTranscript = (project?.transcript?.length ?? 0) > 0;

  const handleSave = useCallback(() => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Project saved", { variant: "success" });
  }, [project]);

  const handleLoad = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loaded = JSON.parse(e.target?.result as string) as Project;
          setProject(loaded);
          toast("Project loaded", { variant: "success" });
        } catch {
          toast("Invalid project file", { variant: "error" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setProject]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Editor</h1>
          {project && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">
              {project.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {project && (
            <>
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearProject}
                className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={handleLoad}>
            <FolderOpen className="h-4 w-4" />
            Load project
          </Button>
        </div>
      </div>

      {project ? (
        <div className="flex flex-col gap-6">
          {/* Top row: video (always) + transcript (only when available) */}
          <div className={`grid grid-cols-1 gap-6 ${hasTranscript ? "lg:grid-cols-2" : ""}`}>
            {/* Video preview — shown as soon as video is uploaded */}
            <div className="flex flex-col gap-4">
              <VideoPreview src={project.videoUrl} className="w-full" />

              {/* Pipeline controls live below the video */}
              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40 p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {hasTranscript ? "Transcription" : "Transcribe this video"}
                </p>
                <PipelineControls />
              </div>
            </div>

            {/* Transcript — only appears after transcription */}
            {hasTranscript && (
              <div className="flex flex-col" style={{ minHeight: "400px", maxHeight: "70vh" }}>
                <TranscriptEditor />
              </div>
            )}
          </div>

          {/* Timeline and render — only shown when there's a transcript */}
          {hasTranscript && (
            <>
              <TimelinePanel />
              <RenderPanel />
            </>
          )}
        </div>
      ) : (
        /* Empty state — just the upload area */
        <div className="flex flex-col gap-6">
          <PipelineControls />
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 text-sm">
              Upload a video above to get started.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={handleLoad}
            >
              <FolderOpen className="h-4 w-4" />
              Or load an existing project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
