// Server-side in-memory job store (single user / local dev)
// Imported by both the render route (writer) and the SSE progress route (reader)

export interface JobState {
  status: "queued" | "rendering" | "done" | "error";
  progress: number;
  outputUrl?: string;
  srtUrl?: string;
  error?: string;
  controllers: Set<ReadableStreamDefaultController<Uint8Array>>;
}

export const jobStore = new Map<string, JobState>();
