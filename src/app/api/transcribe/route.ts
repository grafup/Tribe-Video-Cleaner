import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { resolveApiKey } from "@/lib/utils";
import type { WordSegment, TranscribeResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const UPLOADS_DIR = join(process.cwd(), "uploads");

// ─── ElevenLabs ───────────────────────────────────────────────────────────────

async function transcribeElevenLabs(
  audioPath: string,
  apiKey: string
): Promise<WordSegment[]> {
  const { ElevenLabsClient } = await import("elevenlabs");
  const client = new ElevenLabsClient({ apiKey });

  const response = await client.speechToText.convert({
    file: createReadStream(audioPath) as unknown as Blob,
    model_id: "scribe_v1",
  });

  // ElevenLabs returns words with start/end times
  const words: WordSegment[] = [];
  if (response.words) {
    for (const w of response.words) {
      if (w.type === "word" || !w.type) {
        words.push({
          id: uuidv4(),
          text: w.text ?? "",
          start: w.start ?? 0,
          end: w.end ?? 0,
          confidence: (w as { confidence?: number }).confidence ?? 1,
          type: "normal",
          status: "pending",
        });
      }
    }
  }

  if (words.length === 0 && response.text) {
    // Fallback: no word timestamps — split evenly (rare)
    const parts = response.text.split(/\s+/).filter(Boolean);
    const step = 1;
    parts.forEach((text, i) => {
      words.push({
        id: uuidv4(),
        text,
        start: i * step,
        end: (i + 1) * step,
        confidence: 1,
        type: "normal",
        status: "pending",
      });
    });
  }

  return words;
}

// ─── OpenAI Whisper ───────────────────────────────────────────────────────────

async function transcribeOpenAI(
  audioPath: string,
  apiKey: string
): Promise<WordSegment[]> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });

  const response = await openai.audio.transcriptions.create({
    file: createReadStream(audioPath) as unknown as File,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  const words: WordSegment[] = [];
  const responseAny = response as unknown as Record<string, unknown>;
  const wordTimestamps = responseAny.words as
    | Array<{ word: string; start: number; end: number }>
    | undefined;

  if (wordTimestamps && wordTimestamps.length > 0) {
    for (const w of wordTimestamps) {
      words.push({
        id: uuidv4(),
        text: w.word.trim(),
        start: w.start,
        end: w.end,
        confidence: 1,
        type: "normal",
        status: "pending",
      });
    }
  } else if (response.text) {
    // Segment-level fallback
    const segments = responseAny.segments as
      | Array<{ text: string; start: number; end: number }>
      | undefined;
    if (segments) {
      for (const seg of segments) {
        const segWords = seg.text.trim().split(/\s+/).filter(Boolean);
        const dur = (seg.end - seg.start) / Math.max(segWords.length, 1);
        segWords.forEach((text, i) => {
          words.push({
            id: uuidv4(),
            text,
            start: seg.start + i * dur,
            end: seg.start + (i + 1) * dur,
            confidence: 1,
            type: "normal",
            status: "pending",
          });
        });
      }
    }
  }

  return words;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { audioPath, provider, projectId } = (await request.json()) as {
      audioPath: string;
      provider: "elevenlabs" | "openai";
      projectId: string;
    };

    if (!audioPath || !provider || !projectId) {
      return NextResponse.json(
        { error: "audioPath, provider, and projectId are required" },
        { status: 400 }
      );
    }

    if (!audioPath.startsWith(UPLOADS_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!existsSync(audioPath)) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    let transcript: WordSegment[] = [];

    if (provider === "elevenlabs") {
      const apiKey = resolveApiKey(
        process.env.ELEVENLABS_API_KEY,
        request.headers.get("x-elevenlabs-key")
      );
      if (!apiKey) {
        return NextResponse.json(
          { error: "ElevenLabs API key not configured" },
          { status: 400 }
        );
      }
      transcript = await transcribeElevenLabs(audioPath, apiKey);
    } else {
      const apiKey = resolveApiKey(
        process.env.OPENAI_API_KEY,
        request.headers.get("x-openai-key")
      );
      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenAI API key not configured" },
          { status: 400 }
        );
      }
      transcript = await transcribeOpenAI(audioPath, apiKey);
    }

    const rawText = transcript.map((w) => w.text).join(" ");

    const response: TranscribeResponse = { transcript, provider, rawText };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[transcribe]", err);
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
