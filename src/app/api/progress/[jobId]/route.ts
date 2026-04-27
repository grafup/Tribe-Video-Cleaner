import { NextRequest } from "next/server";
import { jobStore } from "@/lib/job-store";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = jobStore.get(jobId);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  // ?check=1 → lightweight JSON status poll (used as onerror fallback on client)
  if (new URL(request.url).searchParams.get("check") === "1") {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      outputUrl: job.outputUrl ?? null,
      srtUrl: job.srtUrl ?? null,
      error: job.error ?? null,
    });
  }

  const encoder = new TextEncoder();

  let savedController: ReadableStreamDefaultController<Uint8Array> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      savedController = controller;

      // If already done/error, send final event and close
      if (job.status === "done") {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", outputUrl: job.outputUrl, srtUrl: job.srtUrl })}\n\n`
          )
        );
        controller.close();
        return;
      }
      if (job.status === "error") {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: job.error })}\n\n`
          )
        );
        controller.close();
        return;
      }

      // Send current progress immediately
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "progress", percent: job.progress, stage: "Queued" })}\n\n`
        )
      );

      job.controllers.add(controller);

      // Keepalive: send SSE comment every 15 s to prevent proxy/browser idle timeout
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 15_000);
    },
    cancel() {
      if (pingInterval) clearInterval(pingInterval);
      if (savedController) job.controllers.delete(savedController);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
