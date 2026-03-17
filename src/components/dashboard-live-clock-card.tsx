"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";

export function DashboardLiveClockCard({
  isClockedIn,
  statusLabel,
  clockIn,
  hoursWorked,
  location,
}: {
  isClockedIn: boolean;
  statusLabel: string;
  clockIn: string;
  hoursWorked: string;
  location: string;
}) {
  const hydrated = useHydrated();
  const [currentTime, setCurrentTime] = useState("--:--");

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    };

    updateTime();
    const timer = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(timer);
  }, [hydrated]);

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <CardTitle className="text-[1.35rem]">Clock In / Out</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock3 className="h-5 w-5" />
          </div>
          <p className="mt-5 text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{currentTime}</p>
          <p className="mt-4 text-lg font-medium text-emerald-600 dark:text-emerald-400">{statusLabel}</p>
        </div>

        <Button
          asChild
          className={
            isClockedIn
              ? "h-14 w-full rounded-2xl bg-rose-500 text-base font-semibold tracking-wide text-white hover:bg-rose-400"
              : "h-14 w-full rounded-2xl bg-slate-950 text-base font-semibold tracking-wide text-white hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          }
        >
          <Link href="/clock">{isClockedIn ? "CLOCK OUT" : "CLOCK IN"}</Link>
        </Button>

        <div className="space-y-4 border-t border-slate-200/80 pt-5 text-[15px] dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Clock In</span>
            <span className="font-medium text-slate-900 dark:text-slate-50">{clockIn}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Hours Worked</span>
            <span className="font-medium text-slate-900 dark:text-slate-50">{hoursWorked}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Location</span>
            <span className="font-medium text-slate-900 dark:text-slate-50">{location}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
