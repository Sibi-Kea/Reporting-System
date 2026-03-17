"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Activity, ArrowRightLeft, Clock3, DoorOpen, TriangleAlert, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ReceptionState = {
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    timezone: string;
  };
  qrCode: {
    id: string;
    label: string;
    officeLocationName: string;
    departmentName: string | null;
    rotationMinutes: number;
  };
  metrics: {
    teamSize: number;
    currentlyClockedIn: number;
    late: number;
    absent: number;
    pendingApprovals: number;
  };
  mode: "CLOCK_IN" | "CLOCK_OUT" | "FLEX";
  modeTitle: string;
  modeDescription: string;
  qrToken: string;
  doorPath: string;
  expiresAt: string | Date;
  windows: {
    clockIn: string;
    clockOut: string;
  };
};

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{value}</div>
    </div>
  );
}

export function ReceptionDashboard({
  initialState,
}: {
  initialState: ReceptionState;
}) {
  const [state, setState] = useState(initialState);
  const [origin, setOrigin] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const doorUrl = useMemo(() => (origin ? `${origin}${state.doorPath}` : ""), [origin, state.doorPath]);

  useEffect(() => {
    setOrigin(window.location.origin);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!doorUrl) {
      setQrImage(null);
      return () => {
        cancelled = true;
      };
    }

    void QRCode.toDataURL(doorUrl, {
      margin: 1,
      width: 420,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then((image: string) => {
      if (!cancelled) {
        setQrImage(image);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [doorUrl]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const response = await fetch(`/api/public/reception?company=${encodeURIComponent(state.company.slug)}&code=${encodeURIComponent(state.qrCode.id)}`);
      const result = (await response.json().catch(() => null)) as ReceptionState & { error?: string };

      if (!cancelled && response.ok && !result.error) {
        setState(result);
      }
    }

    const heartbeat = window.setInterval(() => {
      void refresh();
    }, 15000);

    const expiresAtMs = new Date(state.expiresAt).getTime();
    const refreshLeadMs = Math.max(1000, expiresAtMs - Date.now() - 4000);
    const expiryRefresh = window.setTimeout(() => {
      void refresh();
    }, refreshLeadMs);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      window.clearTimeout(expiryRefresh);
    };
  }, [state.company.slug, state.expiresAt, state.qrCode.id]);

  const liveTime = now
    ? now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "--:--:--";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#eff6ff_30%,#e2e8f0_100%)] px-6 py-8 dark:bg-slate-950 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden rounded-[32px] border-slate-200/80 bg-white/90 shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <CardContent className="space-y-6 p-6 lg:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-4">
                  {state.company.logoUrl ? (
                    <img alt={`${state.company.name} logo`} className="h-14 w-14 rounded-2xl object-cover" src={state.company.logoUrl} />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                      WT
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Reception dashboard</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{state.company.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{state.qrCode.officeLocationName} - {state.qrCode.label}</p>
                  </div>
                </div>
                <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white dark:bg-white dark:text-slate-950">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60 dark:text-slate-500">Live time</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{liveTime}</p>
                </div>
              </div>

              <div className="rounded-[28px] bg-[linear-gradient(135deg,#1f2a44_0%,#1b315f_100%)] p-6 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={state.mode === "CLOCK_OUT" ? "destructive" : state.mode === "CLOCK_IN" ? "success" : "secondary"}>
                    {state.mode === "CLOCK_OUT" ? "Clock-out mode" : state.mode === "CLOCK_IN" ? "Clock-in mode" : "Flexible mode"}
                  </Badge>
                  <Badge variant="outline">QR rotates every {state.qrCode.rotationMinutes} min</Badge>
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">{state.modeTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{state.modeDescription}</p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/70">
                  <span>Clock in: {state.windows.clockIn}</span>
                  <span>Clock out: {state.windows.clockOut}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile icon={<Users2 className="h-4 w-4" />} label="Total staff" value={state.metrics.teamSize} />
                <MetricTile icon={<DoorOpen className="h-4 w-4" />} label="Currently working" value={state.metrics.currentlyClockedIn} />
                <MetricTile icon={<TriangleAlert className="h-4 w-4" />} label="Late" value={state.metrics.late} />
                <MetricTile icon={<Activity className="h-4 w-4" />} label="Absent" value={state.metrics.absent} />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[32px] border-slate-200/80 bg-white/90 shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <CardContent className="space-y-5 p-6 lg:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Door QR</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Scan to clock</h2>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
              </div>

              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                {qrImage ? (
                  <img alt="Reception door QR code" className="mx-auto h-[320px] w-[320px] rounded-3xl" src={qrImage} />
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Generating live QR...</div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950 dark:text-slate-50">Staff instructions</p>
                    <p className="mt-1 text-sm text-muted-foreground">Scan, enter staff code, and the system will decide whether to clock in or clock out.</p>
                  </div>
                  <Clock3 className="h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">QR expires at {new Date(state.expiresAt).toLocaleTimeString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
