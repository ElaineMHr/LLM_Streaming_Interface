"use client";

import { useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { ChatMessage } from "@/lib/llm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatClient() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOutput("");
    setIsStreaming(true);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: prompt.trim() },
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
        const text = await resp.text().catch(() => "");
        throw new Error(`Request failed: ${resp.status} ${text}`);
      }

      const reader = resp.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setPrompt("");
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

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
              // fallback: append raw
              assistantText += data;
              setOutput(assistantText);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleAbort() {
    readerRef.current?.cancel().catch(() => {});
    abortControllerRef.current?.abort();
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
    <div className="h-full overflow-hidden">
      {/* Message Area - scrollbar at far right */}
      <div className="h-full overflow-y-auto">
        <div className="fixed bg-white w-full h-16 flex items-center justify-between">
          <h1 className="m-4 text-2xl">LLM Streaming Interface</h1>
          <Button type="button" onClick={newChat} className="mr-3">
            + New Chat
          </Button>
        </div>
        <div className="max-w-225 mx-auto px-4 pt-10 pb-28">
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
                        ? "bg-zinc-900 text-white"
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
              <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-white text-zinc-900 whitespace-pre-wrap wrap-break-words">
                {output}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-zinc-100 fixed inset-x-0 bottom-0 h-14"></div>

      {/* Prompt Input fixed to bottom of viewport, centered */}
      <div className="fixed inset-x-0 bottom-0">
        <div className="max-w-225 mx-auto px-4 pb-6 pt-3">
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
                placeholder="Enter prompt..."
              />

              {!isStreaming ? (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="border-2 rounded-full border-zinc-950 w-8 h-8 flex justify-center items-center"
                >
                  <ArrowUp size={18} className="pl-px" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAbort}
                  className="border-2 rounded-full border-zinc-950 w-8 h-8 flex justify-center items-center"
                >
                  <Square
                    size={18}
                    className="fill-current stroke-none pl-px"
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
