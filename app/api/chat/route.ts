import { callLLMStream } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) return new Response("Missing prompt", { status: 400 });

    const upstream = await callLLMStream(prompt);

    // Pass through streaming bytes. Client will parse SSE-ish lines.
    return new Response(upstream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return new Response(err?.message ?? "Server error", { status: 500 });
  }
}
