import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/utils";
import { runLocalDetection } from "@/lib/detection";
import { DEFAULT_SETTINGS } from "@/store/settings";
import type { WordSegment, AnalyzeResponse, AppSettings } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a video transcript analyzer. Analyze the provided timestamped transcript and return ONLY valid JSON with this exact shape:
{
  "filler_segments": [{"start": 0.0, "end": 0.5, "text": "um"}],
  "double_takes": [{"group_id": "g1", "segments": [{"start": 0.0, "end": 2.0}], "best_take_index": 0}],
  "silence_segments": [{"start": 10.2, "end": 11.5}],
  "recommended_cuts": [{"start": 0.0, "end": 0.5, "reason": "filler"}],
  "recommended_keeps": [{"start": 5.0, "end": 8.0, "reason": "good content"}]
}
Return only the JSON object, no prose, no markdown fences.`;

async function analyzeWithOpenAI(
  transcript: WordSegment[],
  apiKey: string
): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });

  const transcriptText = transcript
    .map((w) => `[${w.start.toFixed(2)}-${w.end.toFixed(2)}] ${w.text}`)
    .join(" ");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze this transcript:\n${transcriptText}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  return response.choices[0].message.content ?? "{}";
}

async function analyzeWithAnthropic(
  transcript: WordSegment[],
  apiKey: string
): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const transcriptText = transcript
    .map((w) => `[${w.start.toFixed(2)}-${w.end.toFixed(2)}] ${w.text}`)
    .join(" ");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze this transcript:\n${transcriptText}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "{}";
}

function mergeAIResults(
  segments: WordSegment[],
  aiJson: string
): WordSegment[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(aiJson);
  } catch {
    return segments;
  }

  const result = segments.map((s) => ({ ...s }));

  const fillers = (parsed.filler_segments as Array<{ start: number; end: number }>) ?? [];
  for (const f of fillers) {
    result.forEach((seg) => {
      if (seg.start >= f.start - 0.1 && seg.end <= f.end + 0.1) {
        if (seg.type === "normal") {
          seg.type = "filler";
          seg.status = "pending";
        }
      }
    });
  }

  const cuts = (parsed.recommended_cuts as Array<{ start: number; end: number }>) ?? [];
  for (const c of cuts) {
    result.forEach((seg) => {
      if (seg.start >= c.start - 0.1 && seg.end <= c.end + 0.1) {
        if (seg.status === "pending") seg.status = "remove";
      }
    });
  }

  return result;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      transcript,
      provider,
      settings,
    } = (await request.json()) as {
      transcript: WordSegment[];
      provider: "openai" | "anthropic";
      settings?: Partial<AppSettings>;
    };

    if (!transcript || !provider) {
      return NextResponse.json(
        { error: "transcript and provider required" },
        { status: 400 }
      );
    }

    // Run local detection first
    const mergedSettings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
    let analyzed = runLocalDetection(transcript, mergedSettings);

    // AI pass (optional — if API key available)
    const openaiKey = resolveApiKey(
      process.env.OPENAI_API_KEY,
      request.headers.get("x-openai-key")
    );
    const anthropicKey = resolveApiKey(
      process.env.ANTHROPIC_API_KEY,
      request.headers.get("x-anthropic-key")
    );

    try {
      let aiJson = "{}";
      if (provider === "openai" && openaiKey) {
        aiJson = await analyzeWithOpenAI(transcript, openaiKey);
      } else if (provider === "anthropic" && anthropicKey) {
        aiJson = await analyzeWithAnthropic(transcript, anthropicKey);
      }
      analyzed = mergeAIResults(analyzed, aiJson);
    } catch (aiErr) {
      // AI analysis is best-effort — local detection still runs
      console.warn("[analyze] AI pass failed, using local detection only:", aiErr);
    }

    const fillerCount = analyzed.filter((s) => s.type === "filler").length;
    const silenceCount = analyzed.filter((s) => s.type === "silence").length;
    const doubleCount = analyzed.filter(
      (s) => s.type === "double_take" && !s.isBestTake
    ).length;
    const estimatedSavingsSeconds = analyzed
      .filter((s) => s.status === "remove" || s.type === "silence")
      .reduce((sum, s) => sum + (s.end - s.start), 0);

    const response: AnalyzeResponse = {
      transcript: analyzed,
      summary: {
        fillerCount,
        silenceCount,
        doubleCount,
        estimatedSavingsSeconds,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
