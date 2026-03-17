import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClockPanel } from "@/components/clock-panel";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import { formatTime, minutesToHoursLabel } from "@/lib/utils";
import { getEmployeeDashboardData } from "@/services/attendance-service";

export default async function ClockPage() {
  const session = await requireAuth();
  const employeeData = await getEmployeeDashboardData(session.user.id);
  const todayStatus = employeeData.today.record?.status?.replace("_", " ") ?? "IDLE";

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Badge variant={employeeData.today.record ? "warning" : "secondary"}>{todayStatus}</Badge>
            <Badge variant="outline">{employeeData.user.shift?.name ?? "General shift"}</Badge>
          </div>
        }
        description="Clock in or out fast with the approved methods for your company."
        title="Clock"
      />
      <ClockPanel
        currentMinutes={employeeData.today.currentMinutes}
        record={
          employeeData.today.record
            ? {
                id: employeeData.today.record.id,
                clockIn: employeeData.today.record.clockIn,
                clockOut: employeeData.today.record.clockOut,
                location: employeeData.today.record.location,
                device: employeeData.today.record.device,
                status: employeeData.today.record.status,
              }
            : null
        }
        security={{
          settings: employeeData.security.settings
            ? {
                gpsEnforced: employeeData.security.settings.gpsEnforced,
                gpsEnforcementMode: employeeData.security.settings.gpsEnforcementMode,
                qrClockingEnabled: employeeData.security.settings.qrClockingEnabled,
                faceClockingEnabled: employeeData.security.settings.faceClockingEnabled,
              }
            : null,
          officeLocations: employeeData.security.officeLocations,
          qrCodes: employeeData.security.qrCodes,
          features: employeeData.security.features,
          user: {
            biometricProfile: employeeData.security.user.biometricProfile
              ? {
                  isActive: employeeData.security.user.biometricProfile.isActive,
                }
              : null,
          },
        }}
        shiftType={employeeData.user.shift?.type ?? "DAY"}
      />
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle>Shift summary</CardTitle>
          <CardDescription>Core details for today.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm text-muted-foreground">Shift</p>
            <p className="mt-2 text-lg font-semibold">{employeeData.user.shift?.name ?? "General shift"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm text-muted-foreground">Expected start</p>
            <p className="mt-2 text-lg font-semibold">{employeeData.user.shift?.startTime ?? "08:00"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm text-muted-foreground">Today worked</p>
            <p className="mt-2 text-lg font-semibold">{minutesToHoursLabel(employeeData.today.currentMinutes)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm text-muted-foreground">Clock in</p>
            <p className="mt-2 text-lg font-semibold">{formatTime(employeeData.today.record?.clockIn)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm text-muted-foreground">Clock out</p>
            <p className="mt-2 text-lg font-semibold">{formatTime(employeeData.today.record?.clockOut)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm text-muted-foreground">Late threshold</p>
            <p className="mt-2 text-lg font-semibold">{employeeData.user.shift?.lateAfter ?? "08:10"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
