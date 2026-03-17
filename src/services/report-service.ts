import { Prisma, Role } from "@prisma/client";
import { endOfDay, endOfMonth, format, startOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { calculateAbsenceDays } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { reportFilterSchema } from "@/lib/validations";
import { minutesToHoursLabel } from "@/lib/utils";
import { logAudit } from "@/services/audit-service";

type ReportFilters = {
  companyId: string;
  actorId: string;
  actorRole: Role;
  month: number;
  year: number;
  departmentId?: string;
  search?: string;
};

function buildClockList(entries: { date: Date; clockIn: Date | null; clockOut: Date | null }[], key: "clockIn" | "clockOut") {
  return entries
    .filter((entry) => entry[key])
    .map((entry) => `${format(entry.date, "dd MMM")}: ${format(entry[key] as Date, "HH:mm")}`)
    .join(" | ");
}

export async function getMonthlyReportData(rawFilters: ReportFilters) {
  const filters = reportFilterSchema.parse({
    month: rawFilters.month,
    year: rawFilters.year,
    departmentId: rawFilters.departmentId,
    search: rawFilters.search,
    format: "json",
  });

  const rangeStart = startOfMonth(new Date(filters.year, filters.month - 1, 1));
  const fullRangeEnd = endOfMonth(rangeStart);
  const today = endOfDay(new Date());
  const effectiveRangeEnd = today < fullRangeEnd ? today : fullRangeEnd;

  const scopeWhere =
    rawFilters.actorRole === Role.MANAGER
      ? {
          managerId: rawFilters.actorId,
        }
      : {};

  const users = await prisma.user.findMany({
    where: {
      companyId: rawFilters.companyId,
      role: {
        in: [Role.EMPLOYEE, Role.MANAGER],
      },
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...scopeWhere,
    },
    include: {
      department: true,
      shift: true,
      attendance: {
        where: {
          date: {
            gte: rangeStart,
            lte: fullRangeEnd,
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const rowDetails = users.map((user) => {
    const attendances = user.attendance;
    const totalMinutes = attendances.reduce((sum, entry) => sum + entry.totalMinutes, 0);
    const overtimeMinutes = attendances.reduce((sum, entry) => sum + entry.overtimeMinutes, 0);
    const lateDays = attendances.filter((entry) => entry.lateMinutes > 0).length;
    const absences = calculateAbsenceDays(attendances, rangeStart, effectiveRangeEnd, user.shift?.workDays?.length ? user.shift.workDays : [1, 2, 3, 4, 5]);

    return {
      totalMinutes,
      overtimeMinutes,
      lateDays,
      absences,
      row: {
        employeeName: user.name,
        department: user.department?.name ?? "Unassigned",
        totalHours: minutesToHoursLabel(totalMinutes),
        overtimeHours: minutesToHoursLabel(overtimeMinutes),
        lateDays,
        absences,
        clockInTimes: buildClockList(attendances, "clockIn"),
        clockOutTimes: buildClockList(attendances, "clockOut"),
      },
    };
  });

  const rows = rowDetails.map((item) => item.row);

  const summary = {
    employeeCount: rows.length,
    totalHours: minutesToHoursLabel(rowDetails.reduce((sum, row) => sum + row.totalMinutes, 0)),
    lateDays: rowDetails.reduce((sum, row) => sum + row.lateDays, 0),
    absences: rowDetails.reduce((sum, row) => sum + row.absences, 0),
  };

  return {
    filters,
    rows,
    summary,
    rangeStart,
    rangeEnd: fullRangeEnd,
  };
}

export async function exportReport(rawFilters: ReportFilters & { format: "csv" | "xlsx" | "pdf" }) {
  const report = await getMonthlyReportData(rawFilters);
  const filenameBase = `worktrack-report-${rawFilters.year}-${String(rawFilters.month).padStart(2, "0")}`;

  let buffer: Buffer;
  let contentType: string;
  let extension: string;

  if (rawFilters.format === "csv") {
    const csv = Papa.unparse(report.rows);
    buffer = Buffer.from(csv, "utf-8");
    contentType = "text/csv";
    extension = "csv";
  } else if (rawFilters.format === "xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(report.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Report");
    buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    extension = "xlsx";
  } else {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("WorkTrack Pro Monthly Report", 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [["Employee", "Department", "Total Hours", "Overtime", "Late Days", "Absences"]],
      body: report.rows.map((row) => [
        row.employeeName,
        row.department,
        row.totalHours,
        row.overtimeHours,
        row.lateDays,
        row.absences,
      ]),
      styles: {
        fontSize: 8,
      },
    });
    buffer = Buffer.from(doc.output("arraybuffer"));
    contentType = "application/pdf";
    extension = "pdf";
  }

  await prisma.report.create({
    data: {
      companyId: rawFilters.companyId,
      generatedById: rawFilters.actorId,
      month: rawFilters.month,
      year: rawFilters.year,
      departmentId: rawFilters.departmentId,
      filters: rawFilters satisfies Prisma.InputJsonObject,
      fileUrl: `${filenameBase}.${extension}`,
    },
  });

  await logAudit({
    companyId: rawFilters.companyId,
    userId: rawFilters.actorId,
    action: "EXPORT",
    entity: "report",
    metadata: {
      format: rawFilters.format,
      month: rawFilters.month,
      year: rawFilters.year,
    },
  });

  return {
    buffer,
    contentType,
    filename: `${filenameBase}.${extension}`,
  };
}
