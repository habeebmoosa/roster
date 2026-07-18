import { z } from "zod";
import { ByokError, mapProviderError, streamCompletion } from "@/core/providers";
import { auth } from "@/server/auth";
import { getResolveInputForUser } from "@/server/providers/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Invalid request." } }, { status: 400 });
  }

  // Pre-stream failures (no key, unknown provider, bad base URL) → clean 400.
  let result: ReturnType<typeof streamCompletion>;
  try {
    const input = await getResolveInputForUser(
      session.user.id,
      parsed.data.provider,
      parsed.data.model,
    );
    result = streamCompletion(input, parsed.data.prompt);
  } catch (err) {
    const byok = err instanceof ByokError ? err : mapProviderError(err);
    return Response.json(
      { error: { code: byok.code, message: byok.userMessage } },
      { status: 400 },
    );
  }

  // Stream tokens; if the provider errors mid-stream, append a friendly note.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n⚠️ ${mapProviderError(err).userMessage}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
