import { formatSRTTime } from "./utils";
import type { WordSegment, SubtitleSettings } from "@/types";

interface SubtitleCue {
  index: number;
  start: number;
  end: number;
  text: string;
}

function buildCues(
  segments: WordSegment[],
  settings: SubtitleSettings
): SubtitleCue[] {
  const maxWords = settings.maxWordsPerLine ?? 8;
  const delay = settings.delaySeconds ?? 0;

  const keepWords = segments
    .filter((s) => s.status !== "remove" && s.type !== "silence")
    .sort((a, b) => a.start - b.start);

  const cues: SubtitleCue[] = [];
  let currentWords: WordSegment[] = [];
  let cueIndex = 1;

  const flush = () => {
    if (currentWords.length === 0) return;
    let text = currentWords.map((w) => w.text).join(" ");
    if (settings.uppercase) text = text.toUpperCase();
    cues.push({
      index: cueIndex++,
      start: currentWords[0].start + delay,
      end: currentWords[currentWords.length - 1].end + delay,
      text,
    });
    currentWords = [];
  };

  for (const seg of keepWords) {
    currentWords.push(seg);
    if (currentWords.length >= maxWords) flush();
  }
  flush();
  return cues;
}

export function generateSRT(
  segments: WordSegment[],
  settings: SubtitleSettings
): string {
  const cues = buildCues(segments, settings);
  return cues
    .map(
      (c) =>
        `${c.index}\n${formatSRTTime(c.start)} --> ${formatSRTTime(c.end)}\n${c.text}`
    )
    .join("\n\n");
}

export function generateVTT(
  segments: WordSegment[],
  settings: SubtitleSettings
): string {
  const srt = generateSRT(segments, settings);
  const vtt = srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${vtt}`;
}

// Generate the ASS-style force_style string for FFmpeg subtitle filter
export function buildFFmpegSubtitleStyle(settings: SubtitleSettings): string {
  const hexToASS = (hex: string): string => {
    const r = hex.slice(1, 3);
    const g = hex.slice(3, 5);
    const b = hex.slice(5, 7);
    return `&H00${b}${g}${r}`;
  };

  const alignment =
    settings.position === "top" ? 8 : settings.position === "middle" ? 5 : 2;

  return [
    `FontName=${settings.fontFamily}`,
    `FontSize=${settings.fontSize}`,
    `PrimaryColour=${hexToASS(settings.primaryColor)}`,
    `OutlineColour=${hexToASS(settings.outlineColor)}`,
    `Bold=${settings.bold ? 1 : 0}`,
    `Alignment=${alignment}`,
    "Outline=2",
    "Shadow=0",
  ].join(",");
}
