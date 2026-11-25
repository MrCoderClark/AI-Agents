export default function AgentsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-10" aria-busy="true">
      <p className="sr-only">Loading agents</p>
      <div className="flex flex-col gap-2">
        <div className="h-9 w-40 animate-pulse rounded-md bg-elevated" />
        <div className="h-5 w-56 animate-pulse rounded-md bg-elevated" />
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-border bg-surface" />
      <div className="h-16 animate-pulse rounded-lg border border-border bg-surface" />
    </main>
  );
}
