export function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
    </span>
  );
}
