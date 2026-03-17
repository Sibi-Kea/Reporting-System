import { Role } from "@prisma/client";
import { format } from "date-fns";
import { CompanyManagement } from "@/components/company-management";
import { LocationManagement } from "@/components/location-management";
import { PageHeader } from "@/components/page-header";
import { QrCodeManagement } from "@/components/qr-code-management";
import { SettingsForm } from "@/components/settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireMinimumRole } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { subscriptionPlanLabels, tenantHasFeature } from "@/lib/tenant";
import { getWorkspaceSettings, listCompanies } from "@/services/settings-service";

export default async function SettingsPage() {
  const session = await requireMinimumRole(Role.ADMIN);
  const [workspace, companies] = await Promise.all([
    getWorkspaceSettings(session.user.companyId),
    session.user.role === Role.SUPER_ADMIN ? listCompanies() : Promise.resolve([]),
  ]);

  const companyPlan = workspace.company?.subscriptionPlan ?? session.user.subscriptionPlan;
  const companyStatus = workspace.company?.status ?? session.user.companyStatus;
  const hasGps = tenantHasFeature(companyPlan, "gps");
  const hasQr = tenantHasFeature(companyPlan, "qr");
  const hasFace = tenantHasFeature(companyPlan, "face");
  const companySlug = workspace.company?.slug ?? session.user.companySlug;
  const primaryQrCode = workspace.qrClockCodes[0] ?? null;
  const appBaseUrl = getAppBaseUrl();
  const quickClockUrl = `${appBaseUrl}/quick-clock?company=${workspace.company?.slug ?? session.user.companySlug}`.replace(
    /^\/\//,
    "/",
  );
  const receptionPath = `/reception?company=${encodeURIComponent(companySlug)}${primaryQrCode ? `&code=${encodeURIComponent(primaryQrCode.id)}` : ""}`;
  const receptionUrl = `${appBaseUrl}${receptionPath}`.replace(/^\/\//, "/");

  return (
    <div className="space-y-8">
      <PageHeader
        description="Configure enterprise attendance policy, SaaS security controls, office verification, and recent audit visibility."
        title="Settings"
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{subscriptionPlanLabels[companyPlan]}</Badge>
        <Badge variant={companyStatus === "ACTIVE" ? "success" : "destructive"}>{companyStatus.replace("_", " ")}</Badge>
        <Badge variant="outline">{hasFace ? "Face ID enabled plan" : hasQr ? "QR and GPS plan" : "Core attendance plan"}</Badge>
      </div>

      <Tabs defaultValue="workspace">
        <TabsList className="h-auto flex-wrap rounded-[28px] bg-secondary/50 p-1">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          {session.user.role === Role.SUPER_ADMIN ? <TabsTrigger value="companies">Companies</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="workspace">
          <SettingsForm
            departments={workspace.departments.map((department) => department.name)}
            initialSettings={{
              companyName: workspace.company?.name ?? "",
              logoUrl: workspace.company?.logoUrl ?? "",
              timezone: workspace.settings?.defaultTimezone ?? workspace.company?.timezone ?? "Africa/Johannesburg",
              publicLoginDefault: workspace.company?.publicLoginDefault ?? false,
              quickClockEnabled: workspace.settings?.quickClockEnabled ?? false,
              quickClockRequirePin: workspace.settings?.quickClockRequirePin ?? true,
              gpsEnforced: workspace.settings?.gpsEnforced ?? workspace.company?.gpsEnforced ?? false,
              gpsEnforcementMode: workspace.settings?.gpsEnforcementMode ?? "MARK_REMOTE",
              allowRemoteClocking: workspace.settings?.allowRemoteClocking ?? workspace.company?.allowRemoteClocking ?? true,
              qrClockingEnabled: workspace.settings?.qrClockingEnabled ?? false,
              qrRotationMinutes: workspace.settings?.qrRotationMinutes ?? 5,
              faceClockingEnabled: workspace.settings?.faceClockingEnabled ?? false,
              faceMatchThreshold: workspace.settings?.faceMatchThreshold ?? 0.92,
              enforceClockWindows: workspace.settings?.enforceClockWindows ?? false,
              clockInWindowStart: workspace.settings?.clockInWindowStart ?? "06:00",
              clockInWindowEnd: workspace.settings?.clockInWindowEnd ?? "11:00",
              clockOutWindowStart: workspace.settings?.clockOutWindowStart ?? "15:00",
              clockOutWindowEnd: workspace.settings?.clockOutWindowEnd ?? "23:30",
              lateThresholdMinutes: workspace.settings?.lateThresholdMinutes ?? 10,
              overtimeAfterMinutes: workspace.settings?.overtimeAfterMinutes ?? 540,
              shiftReminderMinutes: workspace.settings?.shiftReminderMinutes ?? 30,
              clockOutReminderMinutes: workspace.settings?.clockOutReminderMinutes ?? 20,
              clockInGraceMinutes: workspace.settings?.clockInGraceMinutes ?? 10,
              ipAllowlist: workspace.settings?.ipAllowlist ?? [],
            }}
            planFeatures={{
              gps: hasGps,
              qr: hasQr,
              face: hasFace,
            }}
            canManagePublicLogin={session.user.role === Role.SUPER_ADMIN}
            quickClockUrl={quickClockUrl}
          />
        </TabsContent>

        <TabsContent value="verification">
          {hasGps || hasQr ? (
            <div className="space-y-6">
              {hasQr ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Reception display</CardTitle>
                    <CardDescription>
                      Use a public reception screen at the door to show live attendance counts and a QR that staff can scan on arrival or departure.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                      <p className="text-sm font-medium">Reception link</p>
                      <p className="mt-2 break-all text-sm text-muted-foreground">{receptionUrl}</p>
                    </div>
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      The door QR rotates automatically and the reception screen switches into clock-out mode when the configured clock-out window starts.
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {primaryQrCode ? (
                        <Button asChild>
                          <a href={receptionPath} rel="noreferrer" target="_blank">
                            Open reception dashboard
                          </a>
                        </Button>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                          Create at least one QR access point below to activate the reception dashboard.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              {hasGps ? <LocationManagement locations={workspace.officeLocations} /> : null}
              {hasQr ? (
                <QrCodeManagement
                  companySlug={companySlug}
                  codes={workspace.qrClockCodes}
                  departments={workspace.departments.map((department) => ({
                    id: department.id,
                    name: department.name,
                  }))}
                  locations={workspace.officeLocations.map((location) => ({
                    id: location.id,
                    name: location.name,
                  }))}
                />
              ) : null}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Enterprise verification</CardTitle>
                <CardDescription>Upgrade this tenant to Growth or Premium to unlock GPS and QR verification controls.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Shift templates</CardTitle>
              <CardDescription>Configured schedules and late thresholds used by the attendance rules engine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.shifts.map((shift) => (
                <div key={shift.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{shift.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {shift.startTime} - {shift.endTime}
                      </p>
                    </div>
                    <Badge>{shift.type}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Late after {shift.lateAfter} / Overtime after {shift.overtimeAfterMinutes} minutes
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {hasFace ? "Premium tenants can enforce biometric clocking with encrypted templates and liveness checks." : "Face recognition is available on the Premium plan."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Recent audit activity</CardTitle>
              <CardDescription>Latest operational changes and tracked user actions across the workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspace.auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.action.replace("_", " ")}</TableCell>
                      <TableCell>{log.entity}</TableCell>
                      <TableCell>{log.user?.name ?? "System"}</TableCell>
                      <TableCell>{format(log.createdAt, "dd MMM yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {session.user.role === Role.SUPER_ADMIN ? (
          <TabsContent value="companies">
            <CompanyManagement
              activeCompanyId={session.user.companyId}
              companies={companies.map((company) => ({
                id: company.id,
                name: company.name,
                slug: company.slug,
                timezone: company.timezone,
                logoUrl: company.logoUrl,
                subscriptionPlan: company.subscriptionPlan,
                status: company.status,
                _count: company._count,
              }))}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
