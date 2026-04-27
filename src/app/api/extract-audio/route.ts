import { NextRequest, NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { join } from "path";
import { existsSync } from "fs";
import type { ExtractAudioResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 600;

const UPLOADS_DIR = join(process.cwd(), "uploads");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ffprobe may or may not be bundled alongside ffmpeg — set path optimistically
// but don't crash if it isn't there.
const ffprobePath = ffmpegInstaller.path.replace(
  /ffmpeg(\.exe)?$/,
  "ffprobe$1"
);
if (existsSync(ffprobePath)) {
  ffmpeg.setFfprobePath(ffprobePath);
}

async function getDuration(videoPath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) {
        // ffprobe not available — duration will be filled in by the video element
        resolve(0);
      } else {
        resolve(meta.format.duration ?? 0);
      }
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { videoPath, projectId } = (await request.json()) as {
      videoPath: string;
      projectId: string;
    };

    if (!videoPath || !projectId) {
      return NextResponse.json(
        { error: "videoPath and projectId required" },
        { status: 400 }
      );
    }

    if (!videoPath.startsWith(UPLOADS_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    const audioFilename = `audio-${projectId}.wav`;
    const audioPath = join(UPLOADS_DIR, audioFilename);

    // Get duration (best-effort — falls back to 0)
    const durationSeconds = await getDuration(videoPath);

    // Extract 16 kHz mono WAV — optimal for ElevenLabs and Whisper
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec("pcm_s16le")
        .audioFrequency(16000)
        .audioChannels(1)
        .output(audioPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    const response: ExtractAudioResponse = { audioPath, durationSeconds };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[extract-audio]", err);
    const message = err instanceof Error ? err.message : "Audio extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
