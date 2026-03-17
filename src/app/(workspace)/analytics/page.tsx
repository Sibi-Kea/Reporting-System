import { Role } from "@prisma/client";
import { AlertTriangle, ShieldCheck, TrendingUp, Users2 } from "lucide-react";
import { AttendanceInsightsChart } from "@/components/attendance-insights-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TeamPresenceChart } from "@/components/team-presence-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireMinimumRole } from "@/lib/auth";
import { tenantHasFeature } from "@/lib/tenant";
import { getManagerDashboardData } from "@/services/attendance-service";
import { getAttendanceInsights } from "@/services/insights-service";

export default async function AnalyticsPage() {
  const session = await requireMinimumRole(Role.MANAGER);

  if (!tenantHasFeature(session.user.subscriptionPlan, "insights")) {
    return (
      <div className="space-y-8">
        <PageHeader description="Advanced attendance analytics are available on Growth and Premium plans." title="Analytics" />
        <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader>
            <CardTitle>Analytics unavailable on this plan</CardTitle>
            <CardDescription>Upgrade the current tenant to unlock attendance intelligence, department ranking, and lateness predictions.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const [managerData, insights] = await Promise.all([
    getManagerDashboardData(session.user.companyId, session.user.id, session.user.role),
    getAttendanceInsights(session.user.companyId, session.user.id, session.user.role),
  ]);

  const departmentChartData = insights.departmentStats.map((department) => ({
    label: department.name,
    attendanceRate: department.attendanceRate,
    overtimeHours: Number((department.overtimeMinutes / 60).toFixed(1)),
  }));

  return (
    <div className="space-y-8">
      <PageHeader description="Attendance patterns, team consistency, and staffing pressure across the current tenant." title="Analytics" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard helper="Employees currently flagged for recurring lateness" icon={<AlertTriangle className="h-4 w-4" />} label="Late risk" value={String(insights.predictedLate.length)} />
        <StatCard helper="Employees with the strongest on-time consistency" icon={<ShieldCheck className="h-4 w-4" />} label="Consistent staff" value={String(insights.consistentEmployees.length)} />
        <StatCard helper="Departments tracked in the analytics model" icon={<Users2 className="h-4 w-4" />} label="Departments" value={String(insights.departmentStats.length)} />
        <StatCard helper="Recommended staffing actions from overtime patterns" highlight icon={<TrendingUp className="h-4 w-4" />} label="Staffing actions" value={String(insights.staffingSuggestions.length)} />
      </div>

      <Tabs defaultValue="charts">
        <TabsList className="h-auto flex-wrap rounded-[28px] bg-secondary/50 p-1">
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="staffing">Staffing</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <TeamPresenceChart absent={managerData.metrics.absent} active={managerData.metrics.currentlyClockedIn} late={managerData.metrics.late} />
            <AttendanceInsightsChart data={departmentChartData} />
          </div>
        </TabsContent>

        <TabsContent value="people">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle>Predicted late arrivals</CardTitle>
                <CardDescription>Employees showing repeated lateness patterns in recent attendance records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.predictedLate.length ? (
                  insights.predictedLate.map((user) => (
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-4 py-3" key={user.name}>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.department}</p>
                      </div>
                      <Badge variant={user.riskScore >= 60 ? "destructive" : "warning"}>{user.riskScore}% risk</Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No employees are currently flagged for lateness risk.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle>Top 5 late employees</CardTitle>
                <CardDescription>Highest late-day counts across the current reporting window.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.lateEmployees.length ? (
                  insights.lateEmployees.map((item) => (
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-4 py-3" key={item.user.id}>
                      <div>
                        <p className="font-medium">{item.user.name}</p>
                        <p className="text-sm text-muted-foreground">{item.user.department?.name ?? "Unassigned"}</p>
                      </div>
                      <Badge variant="warning">{item.lateDays} late days</Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No repeated late arrivals were detected.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle>Most consistent employees</CardTitle>
                <CardDescription>Highest on-time performance scores over the current reporting window.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.consistentEmployees.length ? (
                  insights.consistentEmployees.map((item) => (
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-4 py-3" key={item.user.id}>
                      <div>
                        <p className="font-medium">{item.user.name}</p>
                        <p className="text-sm text-muted-foreground">{item.user.department?.name ?? "Unassigned"}</p>
                      </div>
                      <Badge variant="success">{item.score}% on time</Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Not enough attendance history for a consistency ranking yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staffing">
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle>Staffing suggestions</CardTitle>
              <CardDescription>Recommendations generated from overtime patterns and attendance concentration.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {insights.staffingSuggestions.length ? (
                insights.staffingSuggestions.map((item) => (
                  <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-4" key={item.department}>
                    <p className="font-medium">{item.department}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.suggestion}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No staffing intervention is recommended right now.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
