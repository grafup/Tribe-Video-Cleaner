import { v4 as uuidv4 } from "uuid";
import levenshtein from "fast-levenshtein";
import type { WordSegment, AppSettings } from "@/types";

// ─── Filler word detection ────────────────────────────────────────────────────

export function detectFillerWords(
  segments: WordSegment[],
  fillerWords: string[]
): WordSegment[] {
  const result = segments.map((s) => ({ ...s }));
  // Sort longest multi-word fillers first so they match before sub-phrases
  const sortedFillers = [...fillerWords].sort(
    (a, b) => b.split(" ").length - a.split(" ").length
  );

  for (const filler of sortedFillers) {
    const parts = filler.toLowerCase().split(" ");
    const windowSize = parts.length;

    for (let i = 0; i <= result.length - windowSize; i++) {
      const window = result.slice(i, i + windowSize);
      if (window.some((w) => w.type !== "normal")) continue;

      const windowText = window
        .map((w) => w.text.toLowerCase().replace(/[^a-z\s']/g, "").trim())
        .join(" ");

      if (windowText === filler) {
        for (let j = i; j < i + windowSize; j++) {
          result[j] = { ...result[j], type: "filler", status: "pending" };
        }
      }
    }
  }
  return result;
}

// ─── Silence detection ────────────────────────────────────────────────────────

export function detectSilences(
  segments: WordSegment[],
  minDuration: number,
  paddingBefore: number,
  paddingAfter: number,
  keepNaturalPauses: boolean
): WordSegment[] {
  const words = segments.filter((s) => s.type !== "silence");
  if (words.length < 2) return segments;

  const sorted = [...words].sort((a, b) => a.start - b.start);
  const result: WordSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);

    if (i < sorted.length - 1) {
      const gapStart = sorted[i].end;
      const gapEnd = sorted[i + 1].start;
      const gapDuration = gapEnd - gapStart;

      if (gapDuration < minDuration) continue;
      if (keepNaturalPauses && gapDuration < 0.3) continue;

      const silenceStart = gapStart + paddingBefore;
      const silenceEnd = gapEnd - paddingAfter;

      if (silenceEnd > silenceStart + 0.05) {
        result.push({
          id: uuidv4(),
          text: `[silence ${gapDuration.toFixed(1)}s]`,
          start: silenceStart,
          end: silenceEnd,
          confidence: 1,
          type: "silence",
          status: "pending",
        });
      }
    }
  }
  return result;
}

// ─── Double-take detection ────────────────────────────────────────────────────

interface Sentence {
  words: WordSegment[];
  text: string;
  start: number;
  end: number;
  avgConfidence: number;
}

function jaccardSimilarity(a: string, b: string): number {
  const arrA = a.split(/\s+/).filter(Boolean);
  const arrB = b.split(/\s+/).filter(Boolean);
  const setA = new Set(arrA);
  const setB = new Set(arrB);
  const intersection = arrA.filter((w) => setB.has(w)).length;
  const union = new Set([...arrA, ...arrB]).size;
  return union === 0 ? 0 : intersection / union;
}

function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein.get(a, b);
  return 1 - dist / maxLen;
}

function sentenceSimilarity(a: string, b: string): number {
  return (jaccardSimilarity(a, b) + normalizedLevenshtein(a, b)) / 2;
}

function buildSentence(words: WordSegment[]): Sentence {
  const text = words
    .map((w) => w.text.toLowerCase().replace(/[^a-z0-9\s]/g, ""))
    .join(" ")
    .trim();
  return {
    words,
    text,
    start: words[0].start,
    end: words[words.length - 1].end,
    avgConfidence:
      words.reduce((sum, w) => sum + w.confidence, 0) / words.length,
  };
}

function splitIntoSentences(
  segments: WordSegment[],
  pauseThreshold = 1.0
): Sentence[] {
  const words = segments.filter(
    (s) => s.type !== "silence" && s.text.trim() !== ""
  );
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => a.start - b.start);
  const sentences: Sentence[] = [];
  let current: WordSegment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].start - sorted[i - 1].end;
    if (gap >= pauseThreshold) {
      sentences.push(buildSentence(current));
      current = [sorted[i]];
    } else {
      current.push(sorted[i]);
    }
  }
  if (current.length > 0) sentences.push(buildSentence(current));
  return sentences;
}

export function detectDoubleTakes(
  segments: WordSegment[],
  sensitivity: number
): WordSegment[] {
  const sentences = splitIntoSentences(segments);
  const result = segments.map((s) => ({ ...s }));

  const groups = new Map<string, Sentence[]>();
  const sentenceGroupMap = new Map<number, string>();

  for (let i = 0; i < sentences.length - 1; i++) {
    const a = sentences[i];
    const b = sentences[i + 1];

    // Only compare sentences of similar length (at least 50% overlap in word count)
    const lenRatio =
      Math.min(a.words.length, b.words.length) /
      Math.max(a.words.length, b.words.length, 1);
    if (lenRatio < 0.5) continue;
    // Skip very short sentences (< 3 words) — too many false positives
    if (a.words.length < 3 || b.words.length < 3) continue;

    const sim = sentenceSimilarity(a.text, b.text);
    if (sim < sensitivity) continue;

    const groupA = sentenceGroupMap.get(i);
    const groupB = sentenceGroupMap.get(i + 1);
    const groupId = groupA ?? groupB ?? uuidv4();

    if (!groups.has(groupId)) groups.set(groupId, []);
    const group = groups.get(groupId)!;

    if (!groupA) {
      group.push(a);
      sentenceGroupMap.set(i, groupId);
    }
    if (!groupB) {
      group.push(b);
      sentenceGroupMap.set(i + 1, groupId);
    }
  }

  Array.from(groups.entries()).forEach(([groupId, groupSentences]) => {
    const scored: Array<{ sentence: Sentence; score: number; takeNumber: number }> =
      groupSentences.map((s, idx) => ({
        sentence: s,
        score: s.avgConfidence * s.words.length,
        takeNumber: idx + 1,
      }));
    const bestIdx = scored.reduce(
      (best, cur, idx) => (cur.score > scored[best].score ? idx : best),
      0
    );

    scored.forEach(({ sentence, takeNumber }, idx) => {
      const isBest = idx === bestIdx;
      sentence.words.forEach((word) => {
        const target = result.find((s) => s.id === word.id);
        if (target) {
          target.type = "double_take";
          target.status = isBest ? "keep" : "remove";
          target.takeGroup = groupId;
          target.takeNumber = takeNumber;
          target.isBestTake = isBest;
        }
      });
    });
  });

  return result;
}

// ─── Master detection runner ──────────────────────────────────────────────────

export function runLocalDetection(
  rawSegments: WordSegment[],
  settings: AppSettings
): WordSegment[] {
  let segments = rawSegments;
  segments = detectFillerWords(segments, settings.fillerWords);
  segments = detectSilences(
    segments,
    settings.silenceMinDuration,
    settings.silencePaddingBefore,
    settings.silencePaddingAfter,
    settings.keepNaturalPauses
  );
  segments = detectDoubleTakes(segments, settings.doubleTakeSensitivity);
  return segments;
}
