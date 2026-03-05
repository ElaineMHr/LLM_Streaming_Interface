import { authOptions } from "@/lib/auth";
import { callLLMStream, ChatMessage } from "@/lib/llm";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  // Server-side auth guard: only authenticated sessions can access the streaming endpoint.
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    let body: { messages?: ChatMessage[] };
    try {
      body = (await req.json()) as { messages?: ChatMessage[] };
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }
    const messages = body.messages?.filter(
      (m) => m && typeof m.role === "string" && typeof m.content === "string",
    );

    if (!messages?.length)
      return new Response("Missing messages", { status: 400 });

    const upstream = await callLLMStream(messages, req.signal);

    // Pass through the upstream LLM stream without buffering so tokens
    // arrive to the client immediately. Headers configure SSE-style
    // streaming and prevent proxies from caching or modifying the stream.
    return new Response(upstream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    // Client disconnected / aborted request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err && (err as any).name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    const message = err instanceof Error ? err.message : "Server error";
    return new Response(message, { status: 500 });
  }
}
