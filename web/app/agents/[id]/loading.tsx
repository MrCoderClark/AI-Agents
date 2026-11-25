export default function Loading() {
  return (
    <main className="flex h-dvh overflow-hidden" aria-busy="true">
      <p className="sr-only">Loading canvas</p>
      <div className="w-[220px] shrink-0 border-r border-border bg-surface" />
      <div className="min-w-0 flex-1 bg-canvas" />
      <div className="w-80 shrink-0 border-l border-border bg-surface" />
    </main>
  );
}
