# LLM Streaming Interface

A small Next.js chat application where the user enters a prompt, the prompt is sent to an LLM through a backend API route, and the response is streamed incrementally so tokens/chunks render live in the UI.

This project was built as a mini technical challenge with a focus on:

- streaming implementation
- simple architecture
- clear state management
- minimal UI

## Live Demo

Deployed app:

- https://llm-streaming-interface.vercel.app/

## Demo Login

Use these credentials to test the deployed application:

- Email: **admin@test.com**
- Password: **admin123**

Authentication is intentionally minimal and credentials-based. It was added mainly to demonstrate basic route protection for the chat interface and API endpoint. In production, this would typically be replaced by OAuth or a proper user management system.

## Features

- Prompt input field
- Streaming LLM responses
- Stop generation button
- Basic error handling
- Chat message state stored in React state
- Backend API route to protect API keys
- Simple UI interface

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript

Backend:

- Next.js API Route (`/api/chat`)
- NextAuth credentials auth for route protection

LLM Integration:

- OpenAI-compatible Chat Completions API

Streaming:

- Fetch streaming
- `ReadableStream` reader on the client
- Incremental UI updates from SSE `data:` chunks

## Architecture Overview

```text
User -> Next.js UI -> /api/chat -> LLM Provider
          ^                        |
          |                        v
     Stream Reader <- Response Stream
```

Request flow:

1. User enters a prompt in the chat UI.
2. Client sends full message history to `/api/chat`.
3. API route validates session and calls the LLM with `stream: true`.
4. Upstream response stream is proxied back to the client without buffering.
5. Client reads stream chunks incrementally.
6. UI appends partial content in real time until completion.

## Streaming Implementation

Streaming improves UX by reducing perceived latency: users see output immediately instead of waiting for a full completion.

- The client uses `fetch()` and `response.body.getReader()` to consume chunks.
- SSE `data:` lines are parsed, and token deltas are appended to a local assistant buffer.
- React state updates progressively so the assistant message grows live.
- `AbortController` + `reader.cancel()` are used to stop generation immediately.

## Getting Started (How to Run)

Clone repository:

```bash
git clone https://github.com/ElaineMHr/LLM_Streaming_Interface
cd LLM_Streaming_Interface
npm install
```

Create environment variables in `.env.local`:

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

NEXTAUTH_SECRET=your_random_secret
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD_HASH=<bcrypt_hash>
```

Generate a bcrypt hash for `admin123`:

```bash
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```

Run development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Key Technical Decisions

- API route mediates LLM calls instead of direct frontend calls.
  Trade-off: adds a server hop, but protects API keys and centralizes validation/auth checks.
- Streaming responses are proxied as they arrive.
  Trade-off: stream parsing is more complex than waiting for full JSON, but UX is much better.
- React local state manages message history and live output.
  Trade-off: simple and fast to implement, but no persistence across refresh.
- `AbortController` is used for cancellation.
  Trade-off: slightly more state complexity, but gives users explicit control to stop long generations.
- UI intentionally kept minimal due to challenge time constraints.
  Trade-off: less polish, but clearer focus on streaming behavior and architecture.

## Limitations

- No database persistence
- Chat history resets on refresh
- No model selection UI
- No system prompt configuration UI
- Minimal UI styling
- Sidebar items are static placeholders

## Improvements With More Time

Backend / Data:

- Database integration (MongoDB)
- Persistent chat/session history
- Logging prompts/responses with request IDs
- Token usage tracking per request
- Basic rate limiting

LLM Features:

- System prompt configuration
- Model selection
- Temperature and generation controls
- Tool/function calling support

UI / UX:

- Better loading indicators before first stream chunk
- Markdown and code block rendering
- Auto-scroll improvements for long responses
- Improved mobile responsiveness
- Conversation sidebar connected to stored history

Engineering:

- Structured logging
- Stronger error boundaries and typed error responses
- Unit/integration tests for API and streaming parser

## Notes

This project was intentionally kept simple. The implementation prioritizes streaming and clear architecture over advanced product features. UI polish, persistence, and broader configuration were intentionally deferred.
