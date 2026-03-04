"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { ChatMessage } from "@/lib/llm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThinkingDots } from "@/app/(app)/chat/_components/ThinkingDots";

export default function ChatClient() {
  const [prompt, setPrompt] = useState("");

  // These 3 could be potentially grouped into one streamState
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const hasChat = messages.some(
    (m) => m.role === "user" || m.role === "assistant",
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const frameId = requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    return () => cancelAnimationFrame(frameId);
  }, [messages, output, isStreaming]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setError(null);
    setOutput("");
    setIsStreaming(true);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // nextMessages includes both current user-prompt and the full message history.
    // Server receives the full conversation context.
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmedPrompt },
    ];
    setMessages(nextMessages);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        if (!resp.body) {
          throw new Error("The server did not return a stream body.");
        }
        if (resp.status === 401 || resp.status === 403) {
          throw new Error("Session expired. Please log in again.");
        }
        const text = await resp.text().catch(() => "");
        throw new Error(text || `Request failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode(); // flush decoder internal buffer
          setPrompt("");
          break;
        }

        // Buffer to piece the stream/reader together
        buffer += decoder.decode(value, { stream: true });

        // Expected SSE wire format from /api/chat:
        //   data: {json}\n
        //   data: {json}\n
        //   ...
        //   data: [DONE]\n
        // Each chunk may contain partial lines, so we accumulate into `buffer`,
        // split on "\n", process complete lines, and keep the remainder for
        // the next chunk.
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // "" instead of `undefined` in case the array is empty

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string") {
                assistantText += delta;
                setOutput(assistantText);
              }
            } catch {
              // fallback:
              // Ignore malformed data instead of showing raw text to user
              continue;
            }
          } else {
            assistantText += trimmed;
            setOutput(assistantText);
          }
        }
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText },
      ]);
      setPrompt("");
    } catch (err: unknown) {
      // User-requested stop
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleAbort() {
    // Stop streaming immediately.
    // `reader.cancel()` stops the local ReadableStream consumption (breaks the reader loop),
    // while `AbortController.abort()` cancels the underlying fetch request so the server
    // stops sending data. Calling both ensures the stream is fully terminated.
    readerRef.current?.cancel().catch(() => {});
    abortControllerRef.current?.abort();

    // Add output message to the message history in the case of an early stop
    if (output.trim()) {
      setMessages((prev) => [...prev, { role: "assistant", content: output }]);
      setOutput("");
    }

    setIsStreaming(false);
  }

  function newChat() {
    readerRef.current?.cancel().catch(() => {});
    abortControllerRef.current?.abort();
    setPrompt("");
    setOutput("");
    setError(null);
    setMessages([]);
    setIsStreaming(false);
  }

  return (
    <div className="h-dvh overflow-hidden bg-zinc-100 flex flex-col">
      <header className="h-16 shrink-0 border-b border-zinc-200 bg-white">
        <div className="mx-auto h-full px-4 flex items-center justify-between">
          <h1 className="text-2xl">LLM Streaming Interface</h1>
          <Button
            type="button"
            onClick={newChat}
            className="bg-linear-to-r from-violet-600 to-indigo-600"
          >
            + New Chat
          </Button>
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {!hasChat && !isStreaming ? (
          <div className="h-full flex items-center justify-center text-3xl text-zinc-700">
            What’s on your mind today?
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-4 pb-28">
            <div className="space-y-3">
              {messages
                .filter((m) => m.role !== "system")
                .map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-linear-to-r from-violet-600 to-indigo-600 text-white"
                          : "bg-white text-zinc-900"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
            </div>

            {isStreaming && (
              <div className="flex justify-start mt-3">
                <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-white text-zinc-900 whitespace-pre-wrap wrap-break-word">
                  {output ? output : <ThinkingDots />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 relative">
        {/* Start footer tint at input vertical midpoint: pt-3 (12px) + half of h-14 (28px) = 40px */}
        <div className="absolute inset-x-0 bottom-0 top-0 bg-zinc-100 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 pb-6 pt-3 border-t">
          <div className="h-14 border-2 rounded-full bg-white flex items-center px-2">
            <form
              onSubmit={onSubmit}
              id="prompt-form"
              className="flex w-full items-center gap-2"
            >
              <Input
                className={`flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-4 ${
                  isStreaming ? "text-muted-foreground" : ""
                }`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask anything"
                disabled={isStreaming}
              />

              {!isStreaming ? (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="border-2 rounded-full border-indigo-600 w-8 h-8 flex justify-center items-center"
                >
                  <ArrowUp size={18} className="pl-px text-violet-600" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAbort}
                  className="border-2 rounded-full border-indigo-600  w-8 h-8 flex justify-center items-center bg-linear-to-r from-violet-600 to-indigo-600"
                >
                  <Square
                    size={18}
                    className="fill-current stroke-none pl-px text-white"
                  />
                </button>
              )}
            </form>
          </div>

          {error && <div className="text-red-600 mt-2">{error}</div>}
        </div>
      </div>
    </div>
  );
}
