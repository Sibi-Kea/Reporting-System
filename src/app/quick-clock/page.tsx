import { QuickClockTerminal } from "@/components/quick-clock-terminal";

export default function QuickClockPage({
  searchParams,
}: {
  searchParams?: {
    company?: string;
  };
}) {
  return (
    <main className="min-h-screen bg-[#eef3f8] px-6 py-8 dark:bg-slate-950 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Employee access</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Clock in without full sign-in.</h1>
          <p className="text-base leading-7 text-muted-foreground">
            This quick clock page is designed for mobile employees and kiosk-style usage. It still respects company PIN, GPS, and clock-window rules.
          </p>
        </div>
        <QuickClockTerminal defaultCompanySlug={searchParams?.company ?? ""} />
      </div>
    </main>
  );
}
