"use client";

import { useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

export default function ChatClient() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOutput("");
    setIsStreaming(true);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Request failed: ${resp.status} ${text}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

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
                setOutput((prev) => prev + delta);
              }
            } catch {
              setOutput((prev) => prev + data);
            }
          } else {
            setOutput((prev) => prev + trimmed);
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleAbort() {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>LLM Streaming Interface</h1>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", gap: 8, marginTop: 16 }}
      >
        <input
          className={isStreaming ? "text-muted-foreground" : ""}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt..."
          style={{ flex: 1, padding: 10 }}
        />
        {!isStreaming ? (
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="border-2 rounded-full border-zinc-950 w-8 h-8 flex justify-center items-center"
          >
            <ArrowUp size={18} />
          </button>
        ) : (
          <button
            onClick={handleAbort}
            className="border-2 rounded-full border-zinc-950 w-8 h-8 flex justify-center items-center"
          >
            <Square size={18} />
          </button>
        )}
      </form>

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <div style={{ marginTop: 16, minHeight: 120, whiteSpace: "pre-wrap" }}>
        {output}
      </div>
    </div>
  );
}
