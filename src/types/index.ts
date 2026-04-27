// ─── Segment types ────────────────────────────────────────────────────────────

export type SegmentType = "normal" | "filler" | "silence" | "double_take";
export type SegmentStatus = "keep" | "remove" | "pending";

export interface WordSegment {
  id: string;
  text: string;
  start: number; // seconds (float)
  end: number; // seconds (float)
  confidence: number; // 0–1
  type: SegmentType;
  status: SegmentStatus;
  takeGroup?: string; // shared group ID for all takes in a repeated-phrase group
  takeNumber?: number; // 1-based index within the group
  isBestTake?: boolean;
}

// ─── Subtitle types ───────────────────────────────────────────────────────────

export interface SubtitleSettings {
  fontSize: number;
  fontFamily: string;
  primaryColor: string; // hex e.g. "#ffffff"
  outlineColor: string; // hex
  position: "bottom" | "top" | "middle";
  bold: boolean;
  uppercase: boolean;
  maxWordsPerLine: number;
  delaySeconds: number;
  exportSrtOnly: boolean;
  burnSubtitles: boolean;
}

// ─── App settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  elevenlabsApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  defaultTranscriptionProvider: "elevenlabs" | "openai";
  defaultAnalysisProvider: "openai" | "anthropic";
  fillerWords: string[];
  silenceMinDuration: number; // seconds, default 0.8
  silencePaddingBefore: number; // seconds to keep before silence cut, default 0.1
  silencePaddingAfter: number; // seconds to keep after silence cut, default 0.1
  keepNaturalPauses: boolean;
  doubleTakeSensitivity: number; // 0–1, default 0.75
  outputQuality: "original" | "high" | "medium" | "small";
  generateSubtitles: boolean;
  subtitleSettings: SubtitleSettings;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  videoPath: string; // absolute server path
  audioPath?: string;
  videoUrl: string; // browser URL e.g. /api/files/input-{id}.mp4
  durationSeconds: number;
  transcript: WordSegment[];
  settings: AppSettings;
  createdAt: string;
  updatedAt: string;
}

// ─── Render job ───────────────────────────────────────────────────────────────

export type RenderStatus = "idle" | "queued" | "rendering" | "done" | "error";

export interface RenderJob {
  jobId: string;
  status: RenderStatus;
  progress: number; // 0–100
  outputUrl?: string;
  srtUrl?: string;
  error?: string;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export type PipelineStep =
  | "idle"
  | "uploading"
  | "uploaded"   // video on server, ready to transcribe
  | "extracting"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "rendering";

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface UploadResponse {
  projectId: string;
  videoUrl: string;
  videoPath: string;
  filename: string;
}

export interface ExtractAudioResponse {
  audioPath: string;
  durationSeconds: number;
}

export interface TranscribeResponse {
  transcript: WordSegment[];
  provider: "elevenlabs" | "openai";
  rawText: string;
}

export interface AnalyzeResponse {
  transcript: WordSegment[];
  summary: {
    fillerCount: number;
    silenceCount: number;
    doubleCount: number;
    estimatedSavingsSeconds: number;
  };
}

export interface RenderRequest {
  projectId: string;
  keepSegments: Array<{ start: number; end: number }>;
  outputQuality: AppSettings["outputQuality"];
  generateSubtitles: boolean;
  subtitleSettings?: SubtitleSettings;
  transcript?: WordSegment[];
}

export interface RenderStartResponse {
  jobId: string;
}

// SSE event shapes (sent as JSON strings in the data: field)
export type SSEEvent =
  | { type: "progress"; percent: number; stage: string }
  | { type: "done"; outputUrl: string; srtUrl?: string }
  | { type: "error"; message: string };
