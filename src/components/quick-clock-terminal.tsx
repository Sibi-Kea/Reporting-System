/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { Loader2, LocateFixed, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getClientDeviceLabel } from "@/lib/device";
import { formatTime, minutesToHoursLabel } from "@/lib/utils";

type QuickClockContext = {
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  settings: {
    quickClockRequirePin: boolean;
    gpsEnforced: boolean;
    allowRemoteClocking: boolean;
    enforceClockWindows: boolean;
    clockInWindowStart: string;
    clockInWindowEnd: string;
    clockOutWindowStart: string;
    clockOutWindowEnd: string;
  };
  employee: {
    id: string;
    name: string;
    employeeId: string;
    shiftName: string;
    departmentName: string;
  };
  attendance: {
    clockIn: string | null;
    clockOut: string | null;
    totalMinutes: number;
    location: string | null;
  } | null;
  suggestedAction: "CLOCK_IN" | "CLOCK_OUT";
};

export function QuickClockTerminal({ defaultCompanySlug = "" }: { defaultCompanySlug?: string }) {
  const [companySlug, setCompanySlug] = useState(defaultCompanySlug);
  const [employeeId, setEmployeeId] = useState("");
  const [clockPin, setClockPin] = useState("");
  const [context, setContext] = useState<QuickClockContext | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestLocation, isLoading: isLocating, error: locationError, coordinates } = useGeolocation();

  const statusLabel = useMemo(() => {
    if (!context) {
      return "Verify your employee ID to continue.";
    }

    return context.suggestedAction === "CLOCK_OUT" ? "You are currently clocked in." : "Ready to clock in.";
  }, [context]);

  async function lookupContext() {
    setIsLookingUp(true);
    const response = await fetch("/api/quick-clock/context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companySlug: companySlug.trim().toLowerCase(),
        employeeId: employeeId.trim(),
        clockPin: clockPin.trim(),
      }),
    });
    const result = (await response.json().catch(() => null)) as QuickClockContext & { error?: string };
    setIsLookingUp(false);

    if (!response.ok) {
      setContext(null);
      toast.error(result?.error ?? "Unable to verify quick clock access.");
      return;
    }

    setContext(result);
  }

  async function submitAction() {
    if (!context) {
      return;
    }

    setIsSubmitting(true);
    const shouldRequestGps = context.settings.gpsEnforced;
    const nextCoordinates = shouldRequestGps ? await requestLocation() : coordinates;

    if (shouldRequestGps && !nextCoordinates) {
      setIsSubmitting(false);
      toast.error("GPS coordinates are required for this company.");
      return;
    }

    const response = await fetch("/api/quick-clock/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companySlug: companySlug.trim().toLowerCase(),
        employeeId: employeeId.trim(),
        clockPin: clockPin.trim(),
        device: getClientDeviceLabel(),
        location: nextCoordinates ? `GPS: ${nextCoordinates.latitude.toFixed(4)}, ${nextCoordinates.longitude.toFixed(4)}` : undefined,
        latitude: nextCoordinates?.latitude,
        longitude: nextCoordinates?.longitude,
      }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string; action?: "CLOCK_IN" | "CLOCK_OUT" };
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to complete quick clock action.");
      return;
    }

    toast.success(result.action === "CLOCK_OUT" ? "Clock out successful." : "Clock in successful.");
    await lookupContext();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-3xl">Quick clock</CardTitle>
          <CardDescription>Use company slug, employee code, and access code instead of a full login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="companySlug">Company slug</Label>
              <Input id="companySlug" onChange={(event) => setCompanySlug(event.target.value)} placeholder="sm-techie" value={companySlug} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee code</Label>
              <Input id="employeeId" onChange={(event) => setEmployeeId(event.target.value)} placeholder="EMP-1001" value={employeeId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clockPin">Access code</Label>
              <Input id="clockPin" inputMode="numeric" onChange={(event) => setClockPin(event.target.value)} placeholder="1234" value={clockPin} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={isLookingUp} onClick={() => void lookupContext()} size="lg" type="button">
              {isLookingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify employee
            </Button>
            <Button disabled={isLocating} onClick={() => void requestLocation()} size="lg" type="button" variant="outline">
              {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
              {context?.settings.gpsEnforced ? "Capture required GPS" : "Use my location"}
            </Button>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">How this works</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>1. Enter your company slug and employee code.</p>
              <p>2. Enter your access code if your company requires one.</p>
              <p>3. Allow location access only if your company enforces geofencing.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            {context?.company.logoUrl ? (
              <img alt={`${context.company.name} logo`} className="h-14 w-14 rounded-2xl object-cover" src={context.company.logoUrl} />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white dark:bg-white dark:text-slate-950">
                WT
              </div>
            )}
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Clock station</p>
              <p className="text-2xl font-semibold tracking-tight">{context?.company.name ?? "WorkTrack Pro"}</p>
            </div>
          </div>

          <div className="rounded-[32px] bg-[linear-gradient(135deg,#1f2a44_0%,#1b315f_100%)] p-6 text-white">
            <p className="text-sm uppercase tracking-[0.18em] text-white/60">Current state</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{statusLabel}</p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {context?.settings.enforceClockWindows
                ? `Clock-in window: ${context.settings.clockInWindowStart} - ${context.settings.clockInWindowEnd} / Clock-out window: ${context.settings.clockOutWindowStart} - ${context.settings.clockOutWindowEnd}`
                : "Clock windows are not enforced for this company."}
            </p>
          </div>

          <div className="space-y-4 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="mt-1 font-semibold">{context?.employee.name ?? "--"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shift</p>
              <p className="mt-1 font-semibold">{context?.employee.shiftName ?? "--"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clock in</p>
              <p className="mt-1 font-semibold">{formatTime(context?.attendance?.clockIn)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hours today</p>
              <p className="mt-1 font-semibold">{minutesToHoursLabel(context?.attendance?.totalMinutes ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location capture</p>
              <p className="mt-1 font-semibold">
                {coordinates ? `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}` : context?.attendance?.location ?? "No location captured"}
              </p>
              {locationError ? <p className="mt-2 text-sm text-destructive">{locationError}</p> : null}
            </div>
          </div>

          <Button className="h-16 w-full rounded-[28px] text-lg font-semibold" disabled={!context || isSubmitting || isLocating} onClick={() => void submitAction()} type="button">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            {context?.suggestedAction === "CLOCK_OUT" ? "Clock Out" : "Clock In"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
