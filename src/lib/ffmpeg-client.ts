"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let instance: FFmpeg | null = null;
let initPromise: Promise<FFmpeg> | null = null;

// Self-host these in /public/ffmpeg/ for production to avoid CDN cold-starts.
const CORE_URL =
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js";
const WASM_URL =
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm";
const WORKER_URL =
  "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.worker.js";

export async function getFFmpegInstance(
  onProgress?: (pct: number) => void
): Promise<FFmpeg> {
  if (instance?.loaded) return instance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onProgress) {
      ffmpeg.on("progress", ({ progress }) =>
        onProgress(Math.round(progress * 100))
      );
    }
    await ffmpeg.load({
      coreURL: await toBlobURL(CORE_URL, "text/javascript"),
      wasmURL: await toBlobURL(WASM_URL, "application/wasm"),
      workerURL: await toBlobURL(WORKER_URL, "text/javascript"),
    });
    instance = ffmpeg;
    return ffmpeg;
  })();

  return initPromise;
}

// Extract 16kHz mono WAV audio from a video File object (client-side preview)
export async function extractAudioClientSide(
  videoFile: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpegInstance(onProgress);
  const inputName = "input_extract.mp4";
  const outputName = "audio_extract.wav";
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
  await ffmpeg.exec([
    "-i",
    inputName,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    outputName,
  ]);
  const data = await ffmpeg.readFile(outputName);
  return new Blob([data], { type: "audio/wav" });
}

// Trim a clip and return a blob URL for playback preview
export async function previewClip(
  videoFile: File,
  start: number,
  end: number
): Promise<string> {
  const ffmpeg = await getFFmpegInstance();
  const inputName = "input_preview.mp4";
  const outputName = "output_preview.mp4";
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
  await ffmpeg.exec([
    "-ss",
    String(start),
    "-to",
    String(end),
    "-i",
    inputName,
    "-c",
    "copy",
    outputName,
  ]);
  const data = await ffmpeg.readFile(outputName);
  return URL.createObjectURL(new Blob([data], { type: "video/mp4" }));
}
