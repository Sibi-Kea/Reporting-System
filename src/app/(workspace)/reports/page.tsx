import { Role } from "@prisma/client";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireMinimumRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyReportData } from "@/services/report-service";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: {
    month?: string;
    year?: string;
    departmentId?: string;
  };
}) {
  const session = await requireMinimumRole(Role.MANAGER);
  const today = new Date();
  const month = Number(searchParams?.month ?? String(today.getMonth() + 1));
  const year = Number(searchParams?.year ?? String(today.getFullYear()));

  const [report, departments] = await Promise.all([
    getMonthlyReportData({
      actorId: session.user.id,
      actorRole: session.user.role,
      companyId: session.user.companyId,
      month,
      year,
      departmentId: searchParams?.departmentId,
    }),
    prisma.department.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
    }),
  ]);

  const exportBase = `/api/reports?month=${month}&year=${year}${searchParams?.departmentId ? `&departmentId=${searchParams.departmentId}` : ""}`;

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <div className="flex flex-wrap gap-3">
            {[
              { format: "csv", label: "CSV" },
              { format: "xlsx", label: "Excel" },
              { format: "pdf", label: "PDF" },
            ].map((item) => (
              <Button asChild key={item.format} variant="outline">
                <a href={`${exportBase}&format=${item.format}`}>
                  <Download className="mr-2 h-4 w-4" />
                  {item.label}
                </a>
              </Button>
            ))}
          </div>
        }
        description="Monthly attendance reports with department filters and export workflows for payroll or leadership reviews."
        title="Reports"
      />

      <form className="grid gap-4 rounded-[28px] border border-border bg-card p-4 md:grid-cols-[180px_180px_220px_auto]">
        <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" defaultValue={String(month)} name="month">
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {format(startOfMonth(new Date(year, index, 1)), "MMMM")}
            </option>
          ))}
        </select>
        <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" defaultValue={String(year)} name="year">
          {Array.from({ length: 5 }, (_, index) => {
            const currentYear = today.getFullYear() - index;
            return (
              <option key={currentYear} value={currentYear}>
                {currentYear}
              </option>
            );
          })}
        </select>
        <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" defaultValue={searchParams?.departmentId ?? ""} name="departmentId">
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Run report
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard helper="Employees included in the report" label="Employees" value={String(report.summary.employeeCount)} />
        <StatCard helper="Late incidents in the selected month" label="Late days" value={String(report.summary.lateDays)} />
        <StatCard helper="Recorded absences in scope" label="Absences" value={String(report.summary.absences)} />
        <StatCard
          helper={`Period: ${format(startOfMonth(new Date(year, month - 1, 1)), "dd MMM")} - ${format(endOfMonth(new Date(year, month - 1, 1)), "dd MMM")}`}
          highlight
          label="Report window"
          value={`${format(startOfMonth(new Date(year, month - 1, 1)), "MMM")} ${year}`}
        />
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Late Days</TableHead>
              <TableHead>Absences</TableHead>
              <TableHead>Clock In Times</TableHead>
              <TableHead>Clock Out Times</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TableRow key={`${row.employeeName}-${row.department}`}>
                <TableCell className="font-medium">{row.employeeName}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{row.totalHours}</TableCell>
                <TableCell>{row.overtimeHours}</TableCell>
                <TableCell>
                  <Badge variant={row.lateDays > 0 ? "warning" : "success"}>{row.lateDays}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={row.absences > 0 ? "destructive" : "success"}>{row.absences}</Badge>
                </TableCell>
                <TableCell className="max-w-[280px] text-xs text-muted-foreground">{row.clockInTimes || "--"}</TableCell>
                <TableCell className="max-w-[280px] text-xs text-muted-foreground">{row.clockOutTimes || "--"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
