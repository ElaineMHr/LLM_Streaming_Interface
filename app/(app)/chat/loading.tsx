export default function Loading() {
  return (
    <div className="h-dvh overflow-hidden bg-zinc-100 flex flex-col animate-pulse">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-zinc-200 bg-white">
        <div className="mx-auto h-full px-4 flex items-center justify-between">
          <div className="h-6 w-48 bg-zinc-200 rounded" />
          <div className="h-8 w-24 bg-zinc-200 rounded-md" />
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 pb-28 space-y-3">
          <div className="flex justify-start">
            <div className="h-10 w-2/3 bg-white rounded-2xl" />
          </div>

          <div className="flex justify-end">
            <div className="h-10 w-1/2 bg-zinc-300 rounded-2xl" />
          </div>

          <div className="flex justify-start">
            <div className="h-10 w-3/4 bg-white rounded-2xl" />
          </div>

          <div className="flex justify-end">
            <div className="h-10 w-2/5 bg-zinc-300 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Footer (matches ChatClient structure) */}
      <div className="shrink-0 relative">
        {/* background tint */}
        <div className="absolute inset-x-0 bottom-0 top-0 bg-zinc-100" />

        {/* container with correct border width */}
        <div className="relative max-w-4xl mx-auto px-4 pb-6 pt-3 border-t border-zinc-200">
          <div className="h-14 border-2 rounded-full bg-white flex items-center px-2">
            <div className="h-4 w-full bg-zinc-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
