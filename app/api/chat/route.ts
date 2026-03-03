import { callLLMStream, ChatMessage } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    const messages = body.messages?.filter(
      (m) => m && typeof m.role === "string" && typeof m.content === "string",
    );

    if (!messages?.length)
      return new Response("Missing messages", { status: 400 });

    const upstream = await callLLMStream(messages, req.signal);

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
