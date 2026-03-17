import { AttendanceStatus, Role } from "@prisma/client";
import { eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { AlertTriangle, Clock3, MoreHorizontal, ShieldCheck, Users2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AttendanceOverviewChart } from "@/components/attendance-overview-chart";
import { DashboardDepartmentChart } from "@/components/dashboard-department-chart";
import { DashboardLiveClockCard } from "@/components/dashboard-live-clock-card";
import { DashboardSummaryCard } from "@/components/dashboard-summary-card";
import { DashboardTrendChart } from "@/components/dashboard-trend-chart";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { tenantHasFeature } from "@/lib/tenant";
import { formatTime, minutesToHoursLabel } from "@/lib/utils";
import { getEmployeeDashboardData, getManagerDashboardData } from "@/services/attendance-service";
import { getAttendanceInsights } from "@/services/insights-service";

function percentage(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Number(((part / total) * 100).toFixed(1));
}

function PeopleListCard({
  title,
  items,
  emptyLabel,
  badgeVariant = "success",
}: {
  title: string;
  items: Array<{
    id: string;
    name: string;
    subtitle: string;
    time: string;
  }>;
  emptyLabel: string;
  badgeVariant?: "success" | "warning";
}) {
  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{title}</CardTitle>
        <MoreHorizontal className="h-5 w-5 text-slate-400" />
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items.length ? (
          items.map((item) => (
            <div
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
              key={item.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-100" name={item.name} />
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-50">{item.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
              </div>
              <Badge variant={badgeVariant}>{item.time}</Badge>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-muted-foreground dark:border-slate-800">
            {emptyLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCallout({
  icon,
  tone,
  text,
}: {
  icon: React.ReactNode;
  tone: "warning" | "success";
  text: string;
}) {
  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={
            tone === "warning"
              ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-300"
              : "flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
          }
        >
          {icon}
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{text}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const employeeData = await getEmployeeDashboardData(session.user.id);
  const canSeeManagerView = hasMinimumRole(session.user.role, Role.MANAGER);
  const canSeeInsights = canSeeManagerView && tenantHasFeature(session.user.subscriptionPlan, "insights");
  const canUseReception = canSeeManagerView && tenantHasFeature(session.user.subscriptionPlan, "qr");
  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const receptionHref = `/reception?company=${encodeURIComponent(session.user.companySlug)}`;

  const [managerData, insights] = await Promise.all([
    canSeeManagerView ? getManagerDashboardData(session.user.companyId, session.user.id, session.user.role) : Promise.resolve(null),
    canSeeInsights ? getAttendanceInsights(session.user.companyId, session.user.id, session.user.role) : Promise.resolve(null),
  ]);

  const isClockedIn = Boolean(employeeData.today.record?.clockIn && !employeeData.today.record?.clockOut);
  const clockStatusLabel = isClockedIn ? "You are clocked in" : "Ready to clock in";
  const clockLocation = employeeData.today.record?.remoteClocking
    ? "Remote"
    : employeeData.today.record?.withinGeofence
      ? "Office"
      : employeeData.today.record?.location ?? "--";

  if (!managerData) {
    const employeeChartData = employeeData.graph.map((entry) => ({
      label: new Date(entry.date).toLocaleDateString("en-US", { weekday: "short" }),
      hours: Number((entry.totalMinutes / 60).toFixed(1)),
      overtime: Number((entry.overtimeMinutes / 60).toFixed(1)),
    }));

    return (
      <div className="space-y-8">
        <PageHeader description="Your latest attendance snapshot and work-time trends." title={`Welcome back, ${firstName}`} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardSummaryCard accent="emerald" helper="Current working time today" icon={<Clock3 className="h-4 w-4" />} label="Hours today" value={minutesToHoursLabel(employeeData.today.currentMinutes)} />
          <DashboardSummaryCard accent="sky" helper="Hours booked this week" icon={<Clock3 className="h-4 w-4" />} label="Weekly total" value={minutesToHoursLabel(employeeData.weeklySummary.totalMinutes)} />
          <DashboardSummaryCard accent="rose" helper="Late arrivals this week" icon={<AlertTriangle className="h-4 w-4" />} label="Late" value={String(employeeData.weeklySummary.lateArrivals)} />
          <DashboardSummaryCard accent="violet" helper="Overtime this month" icon={<Users2 className="h-4 w-4" />} label="Overtime" value={minutesToHoursLabel(employeeData.monthlySummary.overtimeMinutes)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <AttendanceOverviewChart data={employeeChartData} description="Worked hours and overtime across recent attendance entries." title="Attendance Trend" />
          <DashboardLiveClockCard
            clockIn={formatTime(employeeData.today.record?.clockIn)}
            hoursWorked={minutesToHoursLabel(employeeData.today.currentMinutes)}
            isClockedIn={isClockedIn}
            location={clockLocation}
            statusLabel={clockStatusLabel}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle>Weekly Summary</CardTitle>
              <CardDescription>Your most important attendance numbers for this week.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Days attended</p>
                <p className="mt-2 text-2xl font-semibold">{employeeData.weeklySummary.daysAttended}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Late arrivals</p>
                <p className="mt-2 text-2xl font-semibold">{employeeData.weeklySummary.lateArrivals}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Hours worked</p>
                <p className="mt-2 text-2xl font-semibold">{minutesToHoursLabel(employeeData.weeklySummary.totalMinutes)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle>Monthly Snapshot</CardTitle>
              <CardDescription>Attendance basics without the extra noise.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Total hours</p>
                <p className="mt-2 text-2xl font-semibold">{minutesToHoursLabel(employeeData.monthlySummary.totalMinutes)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Absences</p>
                <p className="mt-2 text-2xl font-semibold">{employeeData.monthlySummary.absences}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Shift</p>
                <p className="mt-2 text-lg font-semibold">{employeeData.user.shift?.name ?? "General shift"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Manager</p>
                <p className="mt-2 text-lg font-semibold">{employeeData.user.manager?.name ?? "Not assigned"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const managerTrendData = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }).map((day) => ({
    label: format(day, "EEE"),
    value: managerData.trend.filter((entry) => isSameDay(entry.date, day) && entry.status !== AttendanceStatus.ABSENT).length,
  }));

  const departmentOverviewData = (
    insights?.departmentStats.length
      ? insights.departmentStats.map((department) => ({
          label: department.name,
          value: department.attendanceRate,
        }))
      : Array.from(
          managerData.team.reduce((map, item) => {
            const department = item.user.department?.name ?? "Unassigned";
            const current = map.get(department) ?? { label: department, attended: 0, total: 0 };
            current.total += 1;
            current.attended += item.attendance && item.attendance.status !== AttendanceStatus.ABSENT ? 1 : 0;
            map.set(department, current);
            return map;
          }, new Map<string, { label: string; attended: number; total: number }>())
            .values(),
        )
          .map((department) => ({
            label: department.label,
            value: percentage(department.attended, department.total),
          }))
      )
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const activeTeam = managerData.team
    .filter((item) => item.attendance?.status === AttendanceStatus.CLOCKED_IN)
    .slice(0, 3)
    .map((item) => ({
      id: item.user.id,
      name: item.user.name,
      subtitle: item.user.department?.name ?? item.user.position ?? "No department",
      time: formatTime(item.attendance?.clockIn),
    }));

  const lateToday = managerData.team
    .filter((item) => (item.attendance?.lateMinutes ?? 0) > 0)
    .sort((left, right) => (right.attendance?.lateMinutes ?? 0) - (left.attendance?.lateMinutes ?? 0))
    .slice(0, 3)
    .map((item) => ({
      id: item.user.id,
      name: item.user.name,
      subtitle: item.user.department?.name ?? item.user.position ?? "No department",
      time: formatTime(item.attendance?.clockIn),
    }));

  const topLateEmployee = insights?.lateEmployees[0];
  const bestDepartment = departmentOverviewData[0];

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          canUseReception ? (
            <Button asChild variant="outline">
              <a href={receptionHref} rel="noreferrer" target="_blank">
                Open reception
              </a>
            </Button>
          ) : null
        }
        description="Live attendance, team health, and reporting signals in one workspace."
        title={`Welcome back, ${firstName}`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardSummaryCard accent="emerald" helper="Employees currently on shift" icon={<Clock3 className="h-4 w-4" />} label="Clocked In" value={String(managerData.metrics.currentlyClockedIn)} />
            <DashboardSummaryCard accent="rose" helper="Late arrivals captured today" icon={<AlertTriangle className="h-4 w-4" />} label="Late" value={String(managerData.metrics.late)} />
            <DashboardSummaryCard accent="violet" helper="Employees without attendance today" icon={<Users2 className="h-4 w-4" />} label="Absent" value={String(managerData.metrics.absent)} />
            <DashboardSummaryCard accent="sky" helper="Employees in your visibility scope" icon={<Users2 className="h-4 w-4" />} label="Total Staff" value={String(managerData.metrics.teamSize)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PeopleListCard emptyLabel="No employees are currently clocked in." items={activeTeam} title="Currently Clocked In" />
            <PeopleListCard badgeVariant="warning" emptyLabel="No late employees right now." items={lateToday} title="Late Employees" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardTrendChart data={managerTrendData} title="Attendance Trend" valueLabel="Staff present" />
            <DashboardDepartmentChart data={departmentOverviewData} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InsightCallout
              icon={<AlertTriangle className="h-5 w-5" />}
              text={
                topLateEmployee
                  ? `${topLateEmployee.user.name} has been late ${topLateEmployee.lateDays} time${topLateEmployee.lateDays === 1 ? "" : "s"} this month.`
                  : "No recurring late-arrival pattern has been detected this month."
              }
              tone="warning"
            />
            <InsightCallout
              icon={<ShieldCheck className="h-5 w-5" />}
              text={
                bestDepartment
                  ? `${bestDepartment.label} currently has the strongest attendance rate.`
                  : "Department performance data will appear after more attendance records are captured."
              }
              tone="success"
            />
          </div>
        </div>

        <div className="xl:pt-[60px]">
          <DashboardLiveClockCard
            clockIn={formatTime(employeeData.today.record?.clockIn)}
            hoursWorked={minutesToHoursLabel(employeeData.today.currentMinutes)}
            isClockedIn={isClockedIn}
            location={clockLocation}
            statusLabel={clockStatusLabel}
          />
        </div>
      </div>
    </div>
  );
}
