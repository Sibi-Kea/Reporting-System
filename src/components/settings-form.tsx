"use client";

import { GpsEnforcementMode } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { LogoUploadField } from "@/components/logo-upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SettingsInput = {
  companyName: string;
  logoUrl: string;
  timezone: string;
  publicLoginDefault: boolean;
  quickClockEnabled: boolean;
  quickClockRequirePin: boolean;
  gpsEnforced: boolean;
  gpsEnforcementMode: GpsEnforcementMode;
  allowRemoteClocking: boolean;
  qrClockingEnabled: boolean;
  qrRotationMinutes: number;
  faceClockingEnabled: boolean;
  faceMatchThreshold: number;
  enforceClockWindows: boolean;
  clockInWindowStart: string;
  clockInWindowEnd: string;
  clockOutWindowStart: string;
  clockOutWindowEnd: string;
  lateThresholdMinutes: number;
  overtimeAfterMinutes: number;
  shiftReminderMinutes: number;
  clockOutReminderMinutes: number;
  clockInGraceMinutes: number;
  ipAllowlist: string[];
};

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-secondary/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 pr-0 sm:pr-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value} />
    </div>
  );
}

export function SettingsForm({
  initialSettings,
  planFeatures,
  quickClockUrl,
  departments,
  canManagePublicLogin = false,
}: {
  initialSettings: SettingsInput;
  planFeatures: {
    gps: boolean;
    qr: boolean;
    face: boolean;
  };
  quickClockUrl: string;
  departments: string[];
  canManagePublicLogin?: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [values, setValues] = useState(initialSettings);

  async function saveSettings() {
    setIsPending(true);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to update settings.");
      return;
    }

    toast.success("Settings updated.");
    router.refresh();
  }

  async function addDepartment() {
    if (!departmentName) {
      return;
    }

    const response = await fetch("/api/departments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: departmentName,
      }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to create department.");
      return;
    }

    toast.success("Department created.");
    setDepartmentName("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace policy</CardTitle>
        <CardDescription>Organized into tabs so company controls stay manageable instead of becoming one long page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="no-scrollbar w-full flex-nowrap rounded-[26px] bg-secondary/50 p-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="clocking">Clocking</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Company name</Label>
                <Input value={values.companyName} onChange={(event) => setValues((current) => ({ ...current, companyName: event.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <LogoUploadField onChange={(value) => setValues((current) => ({ ...current, logoUrl: value }))} value={values.logoUrl} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={values.timezone} onChange={(event) => setValues((current) => ({ ...current, timezone: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>IP allowlist</Label>
                <Input
                  placeholder="192.168.1.10, 10.0.0.5"
                  value={values.ipAllowlist.join(", ")}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      ipAllowlist: event.target.value
                        .split(",")
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground sm:col-span-2">
                Uploaded branding is reused in the workspace shell and is ready for Vercel Blob in production.
              </div>
              <div className="sm:col-span-2">
                <ToggleRow
                  checked={values.publicLoginDefault}
                  description={
                    canManagePublicLogin
                      ? "Use this company automatically on the public login page and live staff QR."
                      : "Only the super admin can choose which company is used on the public login page."
                  }
                  disabled={!canManagePublicLogin}
                  onCheckedChange={(checked) => setValues((current) => ({ ...current, publicLoginDefault: checked }))}
                  title="Public login workspace"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clocking">
            <div className="space-y-4">
              <ToggleRow
                checked={values.quickClockEnabled}
                description="Allow employees to clock with company slug, employee code, GPS, and optional access code instead of a full login."
                onCheckedChange={(checked) => setValues((current) => ({ ...current, quickClockEnabled: checked }))}
                title="Quick clock page"
              />
              <ToggleRow
                checked={values.quickClockRequirePin}
                description="Require a 4-8 digit employee access code on the public quick clock page."
                disabled={!values.quickClockEnabled}
                onCheckedChange={(checked) => setValues((current) => ({ ...current, quickClockRequirePin: checked }))}
                title="Require access code"
              />
              <ToggleRow
                checked={values.enforceClockWindows}
                description="Restrict when clock in and clock out actions are allowed across the workspace."
                onCheckedChange={(checked) => setValues((current) => ({ ...current, enforceClockWindows: checked }))}
                title="Enforce clock windows"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Clock-in starts</Label>
                  <Input
                    disabled={!values.enforceClockWindows}
                    onChange={(event) => setValues((current) => ({ ...current, clockInWindowStart: event.target.value }))}
                    type="time"
                    value={values.clockInWindowStart}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clock-in ends</Label>
                  <Input
                    disabled={!values.enforceClockWindows}
                    onChange={(event) => setValues((current) => ({ ...current, clockInWindowEnd: event.target.value }))}
                    type="time"
                    value={values.clockInWindowEnd}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clock-out starts</Label>
                  <Input
                    disabled={!values.enforceClockWindows}
                    onChange={(event) => setValues((current) => ({ ...current, clockOutWindowStart: event.target.value }))}
                    type="time"
                    value={values.clockOutWindowStart}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clock-out ends</Label>
                  <Input
                    disabled={!values.enforceClockWindows}
                    onChange={(event) => setValues((current) => ({ ...current, clockOutWindowEnd: event.target.value }))}
                    type="time"
                    value={values.clockOutWindowEnd}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <NumberField label="Late threshold (minutes)" onChange={(value) => setValues((current) => ({ ...current, lateThresholdMinutes: value }))} value={values.lateThresholdMinutes} />
                <NumberField label="Overtime after (minutes)" onChange={(value) => setValues((current) => ({ ...current, overtimeAfterMinutes: value }))} value={values.overtimeAfterMinutes} />
                <NumberField label="Clock-in grace (minutes)" onChange={(value) => setValues((current) => ({ ...current, clockInGraceMinutes: value }))} value={values.clockInGraceMinutes} />
                <NumberField label="Shift reminder (minutes)" onChange={(value) => setValues((current) => ({ ...current, shiftReminderMinutes: value }))} value={values.shiftReminderMinutes} />
                <NumberField label="Clock-out reminder (minutes)" onChange={(value) => setValues((current) => ({ ...current, clockOutReminderMinutes: value }))} value={values.clockOutReminderMinutes} />
              </div>

              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Quick clock URL: <span className="mt-1 block break-all font-medium text-foreground">{quickClockUrl}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <div className="space-y-4">
              <ToggleRow
                checked={values.gpsEnforced}
                description={planFeatures.gps ? "Require geolocation during clock in and clock out actions." : "Available on Growth and Premium plans."}
                disabled={!planFeatures.gps}
                onCheckedChange={(checked) => setValues((current) => ({ ...current, gpsEnforced: checked }))}
                title="GPS enforcement"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>GPS enforcement mode</Label>
                  <Select
                    disabled={!planFeatures.gps}
                    onValueChange={(value) => setValues((current) => ({ ...current, gpsEnforcementMode: value as GpsEnforcementMode }))}
                    value={values.gpsEnforcementMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GPS mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GpsEnforcementMode.MARK_REMOTE}>Mark outside radius as remote</SelectItem>
                      <SelectItem value={GpsEnforcementMode.BLOCK}>Block outside radius</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumberField
                  disabled={!planFeatures.qr}
                  label="QR rotation (minutes)"
                  onChange={(value) => setValues((current) => ({ ...current, qrRotationMinutes: value }))}
                  value={values.qrRotationMinutes}
                />
              </div>

              <ToggleRow
                checked={values.allowRemoteClocking}
                description={planFeatures.gps ? "Permit attendance capture when staff work away from office sites." : "Remote location policy follows core plan defaults."}
                disabled={!planFeatures.gps}
                onCheckedChange={(checked) => setValues((current) => ({ ...current, allowRemoteClocking: checked }))}
                title="Allow remote clocking"
              />
              <ToggleRow
                checked={values.qrClockingEnabled}
                description={planFeatures.qr ? "Allow rotating QR verification by office or department, including the public reception display." : "Available on Growth and Premium plans."}
                disabled={!planFeatures.qr}
                onCheckedChange={(checked) => setValues((current) => ({ ...current, qrClockingEnabled: checked }))}
                title="QR clocking"
              />
              <ToggleRow
                checked={values.faceClockingEnabled}
                description={planFeatures.face ? "Enable biometric enrollment and liveness-checked face clocking." : "Available on the Premium plan."}
                disabled={!planFeatures.face}
                onCheckedChange={(checked) => setValues((current) => ({ ...current, faceClockingEnabled: checked }))}
                title="Face recognition"
              />

              <div className="space-y-2 sm:max-w-xs">
                <Label>Face match threshold</Label>
                <Input
                  disabled={!planFeatures.face}
                  max="1"
                  min="0.5"
                  onChange={(event) => setValues((current) => ({ ...current, faceMatchThreshold: Number(event.target.value) }))}
                  step="0.01"
                  type="number"
                  value={values.faceMatchThreshold}
                />
              </div>

              {!planFeatures.gps || !planFeatures.qr || !planFeatures.face ? (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Plan-based controls are disabled until this tenant is upgraded.
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="departments">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="min-w-0 rounded-[28px] border border-border bg-secondary/20 p-5">
                <p className="text-sm font-medium">Current departments</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {departments.length ? (
                    departments.map((department) => (
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-sm" key={department}>
                        {department}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No departments configured yet.</p>
                  )}
                </div>
              </div>
              <div className="space-y-3 rounded-[28px] border border-border bg-background p-5">
                <Label>New department</Label>
                <Input onChange={(event) => setDepartmentName(event.target.value)} placeholder="Operations" value={departmentName} />
                <Button className="w-full sm:w-auto" onClick={() => void addDepartment()} type="button" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add department
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-4 rounded-[24px] border border-border bg-secondary/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Changes apply across login, quick clock, geofencing, and mobile clocking flows.</p>
          <Button className="w-full sm:w-auto" disabled={isPending} onClick={() => void saveSettings()} type="button">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
