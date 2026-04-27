import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Project,
  WordSegment,
  RenderJob,
  SegmentStatus,
  SegmentType,
  PipelineStep,
} from "@/types";

const MAX_HISTORY = 50;

interface HistoryEntry {
  transcript: WordSegment[];
  label: string;
}

interface PipelineState {
  step: PipelineStep;
  progress: number; // 0–100 within current step
  error: string | null;
}

interface SelectionState {
  selectedSegmentIds: string[];
  hoveredSegmentId: string | null;
  contextMenuSegmentId: string | null;
  contextMenuPosition: { x: number; y: number } | null;
}

function pushHistory(
  history: HistoryEntry[],
  index: number,
  entry: HistoryEntry
): { history: HistoryEntry[]; index: number } {
  const next = history.slice(0, index + 1);
  next.push(entry);
  if (next.length > MAX_HISTORY) next.shift();
  return { history: next, index: next.length - 1 };
}

interface EditorStore {
  project: Project | null;
  pipeline: PipelineState;
  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selection: SelectionState;
  showTimeline: boolean;
  viewMode: "word" | "sentence";
  renderJob: RenderJob | null;

  // Pipeline actions
  setPipelineStep: (step: PipelineStep, progress?: number) => void;
  setPipelineError: (error: string) => void;
  clearPipelineError: () => void;

  // Project
  setProject: (project: Project) => void;
  updateTranscript: (transcript: WordSegment[], label: string) => void;
  clearProject: () => void;

  // Segment editing
  setSegmentStatus: (id: string, status: SegmentStatus) => void;
  setMultipleSegmentStatus: (ids: string[], status: SegmentStatus) => void;
  setAllOfTypeStatus: (type: SegmentType, status: SegmentStatus) => void;
  setBestTake: (takeGroup: string, segmentId: string) => void;
  resetAllStatus: () => void;
  applyAutoSuggestions: () => void;

  // Undo / redo
  undo: () => void;
  redo: () => void;

  // Playback
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;

  // Selection
  selectSegment: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  setHoveredSegment: (id: string | null) => void;
  openContextMenu: (
    id: string,
    position: { x: number; y: number }
  ) => void;
  closeContextMenu: () => void;

  // UI
  toggleTimeline: () => void;
  setViewMode: (mode: "word" | "sentence") => void;

  // Render
  setRenderJob: (job: RenderJob | null) => void;
  updateRenderProgress: (
    progress: number,
    status: RenderJob["status"]
  ) => void;

  // Derived helpers
  getSegmentsToKeep: () => Array<{ start: number; end: number }>;
  getSegmentsToRemove: () => WordSegment[];
}

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      project: null,
      pipeline: { step: "idle", progress: 0, error: null },
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      selection: {
        selectedSegmentIds: [],
        hoveredSegmentId: null,
        contextMenuSegmentId: null,
        contextMenuPosition: null,
      },
      showTimeline: true,
      viewMode: "word",
      renderJob: null,

      // ─── Pipeline ──────────────────────────────────────────────────────────

      setPipelineStep: (step, progress = 0) =>
        set((s) => {
          s.pipeline.step = step;
          s.pipeline.progress = progress;
          s.pipeline.error = null;
        }),

      setPipelineError: (error) =>
        set((s) => {
          s.pipeline.error = error;
        }),

      clearPipelineError: () =>
        set((s) => {
          s.pipeline.error = null;
        }),

      // ─── Project ───────────────────────────────────────────────────────────

      setProject: (project) =>
        set((s) => {
          s.project = project;
          s.history = [
            { transcript: project.transcript, label: "Initial transcript" },
          ];
          s.historyIndex = 0;
          s.canUndo = false;
          s.canRedo = false;
          s.pipeline = { step: "ready", progress: 100, error: null };
          s.renderJob = null;
        }),

      updateTranscript: (transcript, label) =>
        set((s) => {
          if (!s.project) return;
          s.project.transcript = transcript;
          const { history, index } = pushHistory(s.history, s.historyIndex, {
            transcript: [...transcript],
            label,
          });
          s.history = history;
          s.historyIndex = index;
          s.canUndo = index > 0;
          s.canRedo = false;
        }),

      clearProject: () =>
        set((s) => {
          s.project = null;
          s.pipeline = { step: "idle", progress: 0, error: null };
          s.history = [];
          s.historyIndex = -1;
          s.canUndo = false;
          s.canRedo = false;
          s.renderJob = null;
        }),

      // ─── Segment editing ───────────────────────────────────────────────────

      setSegmentStatus: (id, status) =>
        set((s) => {
          if (!s.project) return;
          const seg = s.project.transcript.find((w) => w.id === id);
          if (!seg) return;
          seg.status = status;
          const transcript = [...s.project.transcript];
          const { history, index } = pushHistory(s.history, s.historyIndex, {
            transcript,
            label: `Set "${seg.text}" to ${status}`,
          });
          s.history = history;
          s.historyIndex = index;
          s.canUndo = true;
          s.canRedo = false;
        }),

      setMultipleSegmentStatus: (ids, status) =>
        set((s) => {
          if (!s.project) return;
          const idSet = new Set(ids);
          s.project.transcript.forEach((seg) => {
            if (idSet.has(seg.id)) seg.status = status;
          });
          const transcript = [...s.project.transcript];
          const { history, index } = pushHistory(s.history, s.historyIndex, {
            transcript,
            label: `Set ${ids.length} segments to ${status}`,
          });
          s.history = history;
          s.historyIndex = index;
          s.canUndo = true;
          s.canRedo = false;
        }),

      setAllOfTypeStatus: (type, status) =>
        set((s) => {
          if (!s.project) return;
          s.project.transcript.forEach((seg) => {
            if (seg.type === type) seg.status = status;
          });
          const transcript = [...s.project.transcript];
          const { history, index } = pushHistory(s.history, s.historyIndex, {
            transcript,
            label: `Set all ${type} to ${status}`,
          });
          s.history = history;
          s.historyIndex = index;
          s.canUndo = true;
          s.canRedo = false;
        }),

      setBestTake: (takeGroup, segmentId) =>
        set((s) => {
          if (!s.project) return;
          s.project.transcript.forEach((seg) => {
            if (seg.takeGroup !== takeGroup) return;
            seg.isBestTake = seg.id === segmentId;
            seg.status = seg.id === segmentId ? "keep" : "remove";
          });
          const transcript = [...s.project.transcript];
          const { history, index } = pushHistory(s.history, s.historyIndex, {
            transcript,
            label: `Changed best take`,
          });
          s.history = history;
          s.historyIndex = index;
          s.canUndo = true;
          s.canRedo = false;
        }),

      resetAllStatus: () =>
        set((s) => {
          if (!s.project) return;
          s.project.transcript.forEach((seg) => {
            seg.status = "pending";
          });
          const transcript = [...s.project.transcript];
          const { history, index } = pushHistory(s.history, s.historyIndex, {
            transcript,
            label: "Reset all decisions",
          });
          s.history = history;
          s.historyIndex = index;
          s.canUndo = true;
          s.canRedo = false;
        }),

      applyAutoSuggestions: () =>
        set((s) => {
          if (!s.project) return;
          s.project.transcript.forEach((seg) => {
            if (seg.status === "pending" && seg.type !== "normal") {
              seg.status = "remove";
            }
          });
          const transcript = [...s.project.transcript];
          const { history, index } = pushHistory(s.history, s.historyIndex, {
            transcript,
            label: "Applied auto suggestions",
          });
          s.history = history;
          s.historyIndex = index;
          s.canUndo = true;
          s.canRedo = false;
        }),

      // ─── Undo / redo ───────────────────────────────────────────────────────

      undo: () =>
        set((s) => {
          if (s.historyIndex <= 0 || !s.project) return;
          s.historyIndex -= 1;
          s.project.transcript = [...s.history[s.historyIndex].transcript];
          s.canUndo = s.historyIndex > 0;
          s.canRedo = true;
        }),

      redo: () =>
        set((s) => {
          if (s.historyIndex >= s.history.length - 1 || !s.project) return;
          s.historyIndex += 1;
          s.project.transcript = [...s.history[s.historyIndex].transcript];
          s.canUndo = true;
          s.canRedo = s.historyIndex < s.history.length - 1;
        }),

      // ─── Playback ──────────────────────────────────────────────────────────

      setCurrentTime: (time) =>
        set((s) => {
          s.currentTime = time;
        }),

      setDuration: (duration) =>
        set((s) => {
          s.duration = duration;
        }),

      setIsPlaying: (playing) =>
        set((s) => {
          s.isPlaying = playing;
        }),

      // ─── Selection ─────────────────────────────────────────────────────────

      selectSegment: (id, multiSelect = false) =>
        set((s) => {
          if (multiSelect) {
            const idx = s.selection.selectedSegmentIds.indexOf(id);
            if (idx >= 0) {
              s.selection.selectedSegmentIds.splice(idx, 1);
            } else {
              s.selection.selectedSegmentIds.push(id);
            }
          } else {
            s.selection.selectedSegmentIds = [id];
          }
        }),

      clearSelection: () =>
        set((s) => {
          s.selection.selectedSegmentIds = [];
        }),

      setHoveredSegment: (id) =>
        set((s) => {
          s.selection.hoveredSegmentId = id;
        }),

      openContextMenu: (id, position) =>
        set((s) => {
          s.selection.contextMenuSegmentId = id;
          s.selection.contextMenuPosition = position;
          if (!s.selection.selectedSegmentIds.includes(id)) {
            s.selection.selectedSegmentIds = [id];
          }
        }),

      closeContextMenu: () =>
        set((s) => {
          s.selection.contextMenuSegmentId = null;
          s.selection.contextMenuPosition = null;
        }),

      // ─── UI ────────────────────────────────────────────────────────────────

      toggleTimeline: () =>
        set((s) => {
          s.showTimeline = !s.showTimeline;
        }),

      setViewMode: (mode) =>
        set((s) => {
          s.viewMode = mode;
        }),

      // ─── Render ────────────────────────────────────────────────────────────

      setRenderJob: (job) =>
        set((s) => {
          s.renderJob = job;
        }),

      updateRenderProgress: (progress, status) =>
        set((s) => {
          if (s.renderJob) {
            s.renderJob.progress = progress;
            s.renderJob.status = status;
          }
        }),

      // ─── Derived ───────────────────────────────────────────────────────────

      getSegmentsToKeep: () => {
        const { project } = get();
        if (!project) return [];
        const sorted = [...project.transcript].sort(
          (a, b) => a.start - b.start
        );
        const keepRanges: Array<{ start: number; end: number }> = [];
        let rangeStart: number | null = null;
        let rangeEnd: number | null = null;

        for (const seg of sorted) {
          if (seg.status === "remove") {
            if (rangeStart !== null && rangeEnd !== null) {
              keepRanges.push({ start: rangeStart, end: rangeEnd });
            }
            rangeStart = null;
            rangeEnd = null;
          } else {
            if (rangeStart === null) rangeStart = seg.start;
            rangeEnd = seg.end;
          }
        }
        if (rangeStart !== null && rangeEnd !== null) {
          keepRanges.push({ start: rangeStart, end: rangeEnd });
        }
        return keepRanges;
      },

      getSegmentsToRemove: () => {
        const { project } = get();
        if (!project) return [];
        return project.transcript.filter((s) => s.status === "remove");
      },
    }))
  )
);
