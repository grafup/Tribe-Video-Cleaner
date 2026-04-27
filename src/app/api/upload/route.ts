import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import type { UploadResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const UPLOADS_DIR = join(process.cwd(), "uploads");
const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
  "video/mpeg",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get("video") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported: MP4, MOV, AVI, WebM, MKV` },
        { status: 400 }
      );
    }

    const maxBytes = parseInt(
      process.env.MAX_UPLOAD_BYTES ?? "5368709120",
      10
    );
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max ${Math.round(maxBytes / 1024 / 1024 / 1024)} GB` },
        { status: 413 }
      );
    }

    const projectId = uuidv4();
    const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
    const filename = `input-${projectId}.${ext}`;
    const videoPath = join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, buffer);

    const response: UploadResponse = {
      projectId,
      videoUrl: `/api/files/${filename}`,
      videoPath,
      filename,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
