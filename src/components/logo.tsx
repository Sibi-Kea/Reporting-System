/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  inverted = false,
  logoUrl,
  title = "WorkTrack Pro",
  subtitle = "Time & Attendance",
}: {
  className?: string;
  inverted?: boolean;
  logoUrl?: string | null;
  title?: string;
  subtitle?: string;
}) {
  return (
    <Link className={cn("flex min-w-0 items-center gap-3", className)} href="/dashboard">
      {logoUrl ? (
        <img alt={`${title} logo`} className="h-11 w-11 rounded-2xl object-cover shadow-soft" src={logoUrl} />
      ) : (
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold shadow-soft",
            inverted
              ? "border border-white/10 bg-white/10 text-white"
              : "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
          )}
        >
          WT
        </div>
      )}
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-semibold tracking-wide", inverted ? "text-white" : "text-slate-900 dark:text-slate-100")}>
          {title}
        </p>
        <p className={cn("truncate text-xs", inverted ? "text-white/70" : "text-muted-foreground")}>{subtitle}</p>
      </div>
    </Link>
  );
}
