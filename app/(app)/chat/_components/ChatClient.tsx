"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, Sparkles, User } from "lucide-react";
import { ChatMessage } from "@/lib/llm";
import { ThinkingDots } from "@/app/(app)/chat/_components/ThinkingDots";
import { cn } from "@/lib/utils";

export default function ChatClient() {
  const [prompt, setPrompt] = useState("");
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const frameId = requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    return () => cancelAnimationFrame(frameId);
  }, [messages, output, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Listen for new-chat event dispatched by Sidebar
  useEffect(() => {
    function handleNewChat() {
      newChat();
    }
    window.addEventListener("new-chat", handleNewChat);
    return () => window.removeEventListener("new-chat", handleNewChat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isStreaming) return;
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setError(null);
    setOutput("");
    setIsStreaming(true);
    setPrompt("");

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

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

      function processBufferLines() {
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
              // Ignore malformed data instead of showing raw text to user
            }
          }
        }
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          processBufferLines();

          if (buffer.trim()) {
            buffer += "\n";
            processBufferLines();
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        processBufferLines();
      }

      if (assistantText.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantText },
        ]);
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (err && (err as any).name === "AbortError") {
        // AbortError is expected when the user clicks Stop.
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setIsStreaming(false);
    }
  }

  function handleAbort() {
    readerRef.current?.cancel().catch(() => {});
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }

  // Unmount cleanup to prevent the stream from continuing after navigation.
  useEffect(() => {
    return () => {
      readerRef.current?.cancel().catch(() => {});
      abortControllerRef.current?.abort();
    };
  }, []);

  function newChat() {
    readerRef.current?.cancel().catch(() => {});
    abortControllerRef.current?.abort();
    setPrompt("");
    setOutput("");
    setError(null);
    setMessages([]);
    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {!hasChat && !isStreaming ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Sparkles className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2 text-balance text-center">
              How can I help you today?
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              Ask me anything. I&apos;m here to help with writing, analysis,
              coding, and more.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages
              .filter((m) => m.role !== "system")
              .map((m, idx) => (
                <MessageBubble key={idx} message={m} />
              ))}

            {isStreaming && (
              <MessageBubble
                message={{ role: "assistant", content: output || "" }}
                isStreaming={!output}
              />
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={onSubmit} className="relative">
            <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Aria..."
                disabled={isStreaming}
                rows={1}
                className={cn(
                  "flex-1 resize-none bg-transparent px-2 py-2 text-sm placeholder:text-muted-foreground focus:outline-none",
                  "max-h-[200px] min-h-[44px]",
                  isStreaming && "text-muted-foreground",
                )}
              />

              {!isStreaming ? (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                    prompt.trim()
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAbort}
                  className="shrink-0 w-9 h-9 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-3">
            Aria can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          isUser ? "bg-foreground" : "bg-muted",
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-background" />
        ) : (
          <Sparkles className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 min-w-0", isUser && "flex justify-end")}>
        <div
          className={cn(
            "inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-foreground text-background rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md",
          )}
        >
          {isStreaming ? (
            <ThinkingDots />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
