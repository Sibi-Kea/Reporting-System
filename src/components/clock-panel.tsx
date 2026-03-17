"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LocateFixed, MapPin, QrCode, ScanFace, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { FaceScanDialog } from "@/components/face-scan-dialog";
import { LocationMapCard } from "@/components/location-map-card";
import { QrScannerDialog } from "@/components/qr-scanner-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useHydrated } from "@/hooks/use-hydrated";
import { useOfflineClock } from "@/hooks/use-offline-clock";
import { formatTime, minutesToHoursLabel } from "@/lib/utils";

type ClockRecord = {
  id: string;
  clockIn: Date | string | null;
  clockOut: Date | string | null;
  status: string;
  location: string | null;
  device: string | null;
};

type ClockSecurityContext = {
  settings: {
    gpsEnforced: boolean;
    gpsEnforcementMode: "BLOCK" | "MARK_REMOTE";
    qrClockingEnabled: boolean;
    faceClockingEnabled: boolean;
  } | null;
  officeLocations: Array<{
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }>;
  qrCodes: Array<{
    id: string;
    label: string;
    officeLocation: {
      name: string;
    };
    expiresAt: Date | string | null;
  }>;
  features: {
    gps: boolean;
    qr: boolean;
    face: boolean;
    insights: boolean;
  };
  user: {
    biometricProfile: {
      isActive: boolean;
    } | null;
  };
};

type VerificationMethod = "STANDARD" | "FACE" | "QR";

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[28px] border border-border bg-card/80 p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function MethodCard({
  title,
  description,
  icon,
  badge,
  action,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-[28px] border border-border bg-card/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">{icon}</div>
        {badge}
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-auto pt-5">{action}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 py-3 text-sm last:border-b-0 dark:border-slate-800">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function ClockPanel({
  record,
  currentMinutes,
  shiftType,
  security,
}: {
  record: ClockRecord | null;
  currentMinutes: number;
  shiftType: "DAY" | "EVENING" | "NIGHT" | "FLEX";
  security: ClockSecurityContext;
}) {
  const router = useRouter();
  const { requestLocation, isLoading: isLocating, error: locationError, coordinates } = useGeolocation();
  const { enqueueAction, queuedCount, isSyncing } = useOfflineClock();
  const hydrated = useHydrated();
  const [isPending, setIsPending] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const isClockedIn = Boolean(record?.clockIn && !record?.clockOut);
  const actionLabel = isClockedIn ? "Clock Out" : "Clock In";
  const statusLabel = isClockedIn ? "You are clocked in" : "Ready to clock in";
  const hoursToday = useMemo(() => minutesToHoursLabel(currentMinutes), [currentMinutes]);
  const faceEnabled = security.features.face && Boolean(security.settings?.faceClockingEnabled);
  const qrEnabled = security.features.qr && Boolean(security.settings?.qrClockingEnabled);
  const biometricEnrolled = Boolean(security.user.biometricProfile?.isActive);
  const hasQrPoints = qrEnabled && security.qrCodes.length > 0;
  const locationSummary = coordinates
    ? `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
    : record?.location ?? "No location captured";
  const liveTime = currentTime
    ? currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "--:--";

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    setCurrentTime(new Date());
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hydrated]);

  async function submitClockAction({
    verificationMethod = "STANDARD",
    qrToken,
    biometricVector,
    livenessPassed,
  }: {
    verificationMethod?: VerificationMethod;
    qrToken?: string;
    biometricVector?: number[];
    livenessPassed?: boolean;
  }) {
    setIsPending(true);

    const shouldRequestGps = Boolean(security.settings?.gpsEnforced) && verificationMethod !== "QR";
    const nextCoordinates = shouldRequestGps ? await requestLocation() : coordinates;

    if (security.settings?.gpsEnforced && shouldRequestGps && !nextCoordinates) {
      setIsPending(false);
      toast.error("GPS coordinates are required for this company.");
      return;
    }

    const payload = {
      device: navigator.userAgent,
      location: nextCoordinates ? `GPS: ${nextCoordinates.latitude.toFixed(4)}, ${nextCoordinates.longitude.toFixed(4)}` : undefined,
      latitude: nextCoordinates?.latitude,
      longitude: nextCoordinates?.longitude,
      shiftType,
      verificationMethod,
      qrToken,
      biometricVector,
      livenessPassed,
    };
    const endpoint = isClockedIn ? "/api/clockout" : "/api/clockin";

    if (!navigator.onLine) {
      if (verificationMethod !== "STANDARD") {
        setIsPending(false);
        toast.error("Face and QR verification require an online connection.");
        return;
      }

      enqueueAction({
        endpoint,
        payload,
        queuedAt: new Date().toISOString(),
      });
      toast.info(`${actionLabel} queued offline. It will sync automatically when the connection returns.`);
      setIsPending(false);
      return;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? `Unable to ${actionLabel.toLowerCase()}.`);
      return;
    }

    toast.success(`${actionLabel} successful.`);
    router.refresh();
  }

  async function handleFaceEnrollment(payload: { biometricVector: number[]; livenessPassed: boolean }) {
    setIsPending(true);
    const response = await fetch("/api/biometrics/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: payload.biometricVector,
        livenessPassed: payload.livenessPassed,
      }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to enroll biometric profile.");
      return;
    }

    toast.success("Face profile enrolled.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_360px]">
        <Card className="overflow-hidden border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isClockedIn ? "warning" : "success"}>{statusLabel}</Badge>
              <Badge variant="outline">{shiftType} shift</Badge>
              {security.features.gps ? (
                <Badge variant="outline">{security.settings?.gpsEnforcementMode === "BLOCK" ? "Office geofence active" : "Remote marking active"}</Badge>
              ) : null}
              {queuedCount ? <Badge variant="secondary">{queuedCount} queued offline</Badge> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard helper="First captured attendance event today" label="Clock in" value={formatTime(record?.clockIn)} />
              <MetricCard helper="Latest captured attendance event today" label="Clock out" value={formatTime(record?.clockOut)} />
              <MetricCard helper="Current total for this working day" label="Hours today" value={hoursToday} />
            </div>

            <div className="rounded-[32px] bg-[linear-gradient(135deg,#1f2a44_0%,#1b315f_100%)] p-6 text-white shadow-panel">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl space-y-3">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/60">Clock station</p>
                  <div>
                    <p className="text-2xl font-semibold tracking-tight">{isClockedIn ? "End this shift cleanly." : "Start your shift in one tap."}</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      {security.features.gps
                        ? "Location will be checked automatically when company rules require it."
                        : "Standard clocking is ready immediately and still supports offline queueing."}
                    </p>
                  </div>
                </div>
                <div className="w-full lg:w-[300px]">
                  <Button
                    className={
                      isClockedIn
                        ? "h-20 w-full rounded-[28px] bg-rose-500 text-lg font-semibold text-white hover:bg-rose-400"
                        : "h-20 w-full rounded-[28px] bg-white text-lg font-semibold text-slate-950 hover:bg-slate-100"
                    }
                    disabled={isPending || isLocating}
                    onClick={() => void submitClockAction({ verificationMethod: "STANDARD" })}
                    size="lg"
                    type="button"
                  >
                    {actionLabel}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <MethodCard
                action={
                  faceEnabled ? (
                    biometricEnrolled ? (
                      <FaceScanDialog
                        actionLabel={`${actionLabel} with Face ID`}
                        description="Use liveness-checked biometric verification to complete this clock action."
                        onComplete={(payload) => submitClockAction({ verificationMethod: "FACE", ...payload })}
                        triggerClassName="w-full rounded-2xl"
                        triggerVariant="default"
                      />
                    ) : (
                      <FaceScanDialog
                        actionLabel="Enroll Face ID"
                        description="Capture a secure face template with blink and head-movement liveness checks."
                        onComplete={handleFaceEnrollment}
                        triggerClassName="w-full rounded-2xl"
                        triggerVariant="secondary"
                      />
                    )
                  ) : (
                    <Button className="w-full rounded-2xl" disabled type="button" variant="outline">
                      Face ID unavailable
                    </Button>
                  )
                }
                badge={<Badge variant={faceEnabled ? (biometricEnrolled ? "success" : "warning") : "secondary"}>{faceEnabled ? (biometricEnrolled ? "Enrolled" : "Setup needed") : "Premium"}</Badge>}
                description={
                  faceEnabled
                    ? biometricEnrolled
                      ? "Use liveness-checked Face ID for this clock action."
                      : "Enroll once on this device to unlock biometric clocking."
                    : "Face recognition is not available on the current tenant plan."
                }
                icon={<ScanFace className="h-4 w-4" />}
                title={biometricEnrolled ? `${actionLabel} with Face ID` : "Enroll Face ID"}
              />

              <MethodCard
                action={
                  hasQrPoints ? (
                    <QrScannerDialog
                      actionLabel={`${actionLabel} with QR`}
                      description="Scan the rotating office QR code to verify this clock action."
                      onDetected={(token) => submitClockAction({ verificationMethod: "QR", qrToken: token })}
                      triggerClassName="w-full rounded-2xl"
                      triggerVariant="default"
                    />
                  ) : (
                    <Button className="w-full rounded-2xl" disabled type="button" variant="outline">
                      {qrEnabled ? "No QR access point" : "QR unavailable"}
                    </Button>
                  )
                }
                badge={<Badge variant={hasQrPoints ? "success" : qrEnabled ? "warning" : "secondary"}>{hasQrPoints ? `${security.qrCodes.length} active` : qrEnabled ? "No live codes" : "Plan locked"}</Badge>}
                description={
                  qrEnabled
                    ? hasQrPoints
                      ? "Scan the rotating office QR code for controlled clocking."
                      : "QR clocking is enabled, but no active access points are configured yet."
                    : "QR clocking is not available on the current tenant plan."
                }
                icon={<QrCode className="h-4 w-4" />}
                title={`${actionLabel} with QR`}
              />

              <MethodCard
                action={
                  security.features.gps ? (
                    <Button className="w-full rounded-2xl" disabled={isPending || isLocating} onClick={() => void requestLocation()} type="button" variant="outline">
                      <MapPin className="mr-2 h-4 w-4" />
                      {coordinates ? "Refresh GPS" : "Capture GPS"}
                    </Button>
                  ) : (
                    <Button className="w-full rounded-2xl" disabled type="button" variant="outline">
                      GPS not required
                    </Button>
                  )
                }
                badge={<Badge variant={coordinates ? "success" : security.features.gps ? "warning" : "secondary"}>{coordinates ? "Captured" : security.features.gps ? "Needs capture" : "Optional"}</Badge>}
                description={
                  security.features.gps
                    ? security.settings?.gpsEnforced
                      ? "Capture a location fix before clocking if you want to verify early."
                      : "Location is optional, but useful for verifying office presence."
                    : "Your current plan does not require GPS capture for standard clocking."
                }
                icon={<LocateFixed className="h-4 w-4" />}
                title="GPS readiness"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Clock3 className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground">Clock In / Out</p>
                <div className="mt-3 text-5xl font-semibold tracking-tight">{liveTime}</div>
                <p className="mt-3 text-base font-medium text-emerald-600 dark:text-emerald-400">{statusLabel}</p>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-slate-50/80 px-4 dark:border-slate-800 dark:bg-slate-900/70">
                <DetailRow label="Clock in" value={formatTime(record?.clockIn)} />
                <DetailRow label="Clock out" value={formatTime(record?.clockOut)} />
                <DetailRow label="Hours worked" value={hoursToday} />
                <DetailRow label="Location" value={locationSummary} />
              </div>

              {locationError ? <p className="mt-4 text-sm text-destructive">{locationError}</p> : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle>Connection & device</CardTitle>
              <CardDescription>Only the details you might need before clocking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <p className="font-medium text-foreground">Offline queue</p>
                <p className="mt-1">
                  {queuedCount ? `${queuedCount} standard clock action(s) are waiting to sync.` : isSyncing ? "Queued actions are syncing now." : "No queued actions."}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <p className="font-medium text-foreground">Device</p>
                <p className="mt-1 line-clamp-3">{record?.device ?? "Device details will be recorded on your next clock action."}</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <WifiOff className="mt-0.5 h-4 w-4 text-primary" />
                <p>Offline queueing supports the standard clock button only.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {security.features.gps && security.officeLocations.length ? (
        <LocationMapCard currentCoordinates={coordinates} officeLocations={security.officeLocations} />
      ) : null}
    </div>
  );
}
