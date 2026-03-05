/**
 * Sends a streaming chat completion request to the configured LLM provider.
 *
 * This function calls an OpenAI-compatible `/chat/completions` endpoint with
 * `stream: true` enabled. The provider returns an SSE-style stream where each
 * chunk contains partial token deltas (`choices[].delta.content`).
 *
 * The raw ReadableStream from `fetch()` is returned so that the caller
 * (the API route) can proxy the stream to the client without buffering
 * the entire response in memory.
 *
 * @param messages - Conversation history including system, user, and assistant messages.
 * @param signal - Optional AbortSignal used to cancel the upstream request.
 *
 * @returns A ReadableStream of Uint8Array chunks representing the provider's
 * streaming response.
 *
 * @throws Error if the API key is missing or the upstream request fails.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callLLMStream(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  // Ensure API key exists at runtime
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true, // enables token streaming (SSE frames)
      messages,
      temperature: 0.7,
    }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `LLM request failed: ${resp.status} ${resp.statusText} ${text}`,
    );
  }

  // Return the raw stream so the API route can proxy it directly to the client
  // without buffering the full response in memory.
  return resp.body;
}
