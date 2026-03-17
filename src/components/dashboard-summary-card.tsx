import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardSummaryCard({
  label,
  value,
  helper,
  icon,
  accent = "emerald",
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: React.ReactNode;
  accent?: "emerald" | "rose" | "violet" | "sky";
}) {
  const accentClass = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    violet: "bg-violet-500",
    sky: "bg-sky-500",
  }[accent];

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
          </div>
          {icon ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              {icon}
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{helper ?? "Current workspace snapshot"}</p>
          <span className={cn("h-3 w-3 rounded-full", accentClass)} />
        </div>
      </CardContent>
    </Card>
  );
}
