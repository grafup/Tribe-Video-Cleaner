import { NextRequest, NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { join } from "path";
import { existsSync, writeFileSync } from "fs";
import { mkdir } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { mergeTimeRanges } from "@/lib/utils";
import { generateSRT, buildFFmpegSubtitleStyle } from "@/lib/subtitles";
import { jobStore } from "@/lib/job-store";
import type { JobState } from "@/lib/job-store";
import type { RenderRequest, SSEEvent } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 600;

const UPLOADS_DIR = join(process.cwd(), "uploads");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function emit(job: JobState, event: SSEEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  Array.from(job.controllers).forEach((ctrl) => {
    try {
      ctrl.enqueue(encoded);
    } catch {
      // subscriber disconnected
    }
  });
}

// ─── FFmpeg quality presets ───────────────────────────────────────────────────

function qualityArgs(quality: string): string[] {
  switch (quality) {
    case "original":
      return [
        "-c:v", "libx264", "-crf", "17", "-preset", "slow",
        "-c:a", "aac", "-b:a", "256k",
      ];
    case "high":
      return [
        "-c:v", "libx264", "-crf", "18", "-preset", "fast",
        "-c:a", "aac", "-b:a", "192k",
      ];
    case "medium":
      return [
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-c:a", "aac", "-b:a", "128k",
      ];
    case "small":
      return [
        "-c:v", "libx264", "-crf", "28", "-preset", "fast",
        "-vf", "scale=1280:-2",
        "-c:a", "aac", "-b:a", "96k",
      ];
    default:
      return ["-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "aac"];
  }
}

// ─── Render function ──────────────────────────────────────────────────────────

async function doRender(
  jobId: string,
  req: RenderRequest,
  videoPath: string
): Promise<void> {
  const job = jobStore.get(jobId)!;

  try {
    const outputFilename = `output-${jobId}.mp4`;
    const outputPath = join(UPLOADS_DIR, outputFilename);

    const keeps = mergeTimeRanges(req.keepSegments).filter(
      (r) => r.end - r.start > 0.05
    );

    if (keeps.length === 0) {
      throw new Error("No segments to keep — all content marked for removal");
    }

    emit(job, { type: "progress", percent: 5, stage: "Building edit list" });

    // Build filter_complex for concatenation of kept segments
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    keeps.forEach((seg, i) => {
      filterParts.push(
        `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v${i}]`
      );
      filterParts.push(
        `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}]`
      );
      concatInputs.push(`[v${i}][a${i}]`);
    });

    filterParts.push(
      `${concatInputs.join("")}concat=n=${keeps.length}:v=1:a=1[outv][outa]`
    );

    // Subtitle burn-in
    let filterComplex = filterParts.join(";");
    let mapArgs: string[];

    if (
      req.generateSubtitles &&
      req.subtitleSettings?.burnSubtitles &&
      req.transcript &&
      req.transcript.length > 0
    ) {
      const srtPath = join(UPLOADS_DIR, `subs-${jobId}.srt`);
      const srtContent = generateSRT(req.transcript, req.subtitleSettings!);
      writeFileSync(srtPath, srtContent, "utf-8");

      const style = buildFFmpegSubtitleStyle(req.subtitleSettings!);
      // Escape path for FFmpeg filter
      const escapedPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
      filterParts[filterParts.length - 1] =
        `${concatInputs.join("")}concat=n=${keeps.length}:v=1:a=1[merged_v][outa]`;
      filterParts.push(
        `[merged_v]subtitles='${escapedPath}':force_style='${style}'[outv]`
      );
      filterComplex = filterParts.join(";");
    }

    if (
      req.generateSubtitles &&
      !req.subtitleSettings?.burnSubtitles &&
      req.transcript
    ) {
      // Export SRT only
      const srtFilename = `subs-${jobId}.srt`;
      const srtPath = join(UPLOADS_DIR, srtFilename);
      const srtContent = generateSRT(req.transcript, req.subtitleSettings!);
      writeFileSync(srtPath, srtContent, "utf-8");
      job.srtUrl = `/api/files/${srtFilename}`;
    }

    mapArgs = ["-map", "[outv]", "-map", "[outa]"];

    emit(job, { type: "progress", percent: 10, stage: "Starting FFmpeg" });

    await new Promise<void>((resolve, reject) => {
      const qArgs = qualityArgs(req.outputQuality);

      const cmd = ffmpeg(videoPath)
        .complexFilter(filterComplex)
        .outputOptions([...mapArgs, ...qArgs, "-movflags", "+faststart"])
        .output(outputPath);

      cmd.on("progress", (prog) => {
        const pct = Math.min(
          90,
          10 + Math.round((prog.percent ?? 0) * 0.8)
        );
        job.progress = pct;
        emit(job, {
          type: "progress",
          percent: pct,
          stage: `Rendering (${Math.round(prog.percent ?? 0)}%)`,
        });
      });

      cmd.on("end", () => resolve());
      cmd.on("error", (err: Error) => reject(err));
      cmd.run();
    });

    const outputUrl = `/api/files/${outputFilename}`;
    job.status = "done";
    job.progress = 100;
    job.outputUrl = outputUrl;

    emit(job, {
      type: "done",
      outputUrl,
      srtUrl: job.srtUrl,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Render failed";
    job.status = "error";
    job.error = message;
    emit(job, { type: "error", message });
    console.error("[render]", err);
  } finally {
    // Close all SSE streams
    Array.from(job.controllers).forEach((ctrl) => {
      try {
        ctrl.close();
      } catch {
        //
      }
    });
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const req = (await request.json()) as RenderRequest;

    if (!req.projectId || !req.keepSegments) {
      return NextResponse.json(
        { error: "projectId and keepSegments required" },
        { status: 400 }
      );
    }

    // Find the input video
    const files = (await import("fs")).readdirSync(UPLOADS_DIR);
    const inputFile = files.find((f) => f.startsWith(`input-${req.projectId}`));
    if (!inputFile) {
      return NextResponse.json(
        { error: "Original video not found. Please re-upload." },
        { status: 404 }
      );
    }

    const videoPath = join(UPLOADS_DIR, inputFile);
    if (!existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video file missing on server" },
        { status: 404 }
      );
    }

    const jobId = uuidv4();
    jobStore.set(jobId, {
      status: "queued",
      progress: 0,
      controllers: new Set(),
    });

    // Start render asynchronously
    void doRender(jobId, req, videoPath);

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    console.error("[render POST]", err);
    return NextResponse.json({ error: "Failed to start render" }, { status: 500 });
  }
}
