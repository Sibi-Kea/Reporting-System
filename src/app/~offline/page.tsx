export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="surface-card max-w-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <span className="text-2xl font-semibold">WT</span>
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">You are offline</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          WorkTrack Pro will keep your workspace shell available and queue clock actions locally until your
          connection returns.
        </p>
      </div>
    </main>
  );
}
