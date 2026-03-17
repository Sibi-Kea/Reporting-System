import { AttendanceStatus, Role } from "@prisma/client";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { tenantHasFeature } from "@/lib/tenant";

function percentage(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Number(((part / total) * 100).toFixed(1));
}

export async function getAttendanceInsights(companyId: string, actorId: string, role: Role) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
    },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  if (!tenantHasFeature(company.subscriptionPlan, "insights")) {
    return {
      lateEmployees: [],
      consistentEmployees: [],
      departmentStats: [],
      predictedLate: [],
      staffingSuggestions: [],
    };
  }

  const since = startOfDay(subDays(new Date(), 29));
  const users = await prisma.user.findMany({
    where: {
      companyId,
      ...(role === Role.MANAGER ? { managerId: actorId } : {}),
      role: {
        in: [Role.EMPLOYEE, Role.MANAGER],
      },
    },
    include: {
      department: true,
      attendance: {
        where: {
          date: {
            gte: since,
            lte: endOfDay(new Date()),
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  const lateEmployees = users
    .map((user) => ({
      user,
      lateDays: user.attendance.filter((entry) => entry.lateMinutes > 0).length,
      lateRate: percentage(
        user.attendance.filter((entry) => entry.lateMinutes > 0).length,
        user.attendance.filter((entry) => entry.status !== AttendanceStatus.ABSENT).length,
      ),
    }))
    .sort((left, right) => right.lateDays - left.lateDays)
    .slice(0, 5);

  const consistentEmployees = users
    .map((user) => {
      const attendanceDays = user.attendance.filter((entry) => entry.status !== AttendanceStatus.ABSENT);
      const onTimeDays = attendanceDays.filter((entry) => entry.lateMinutes === 0);
      return {
        user,
        score: percentage(onTimeDays.length, Math.max(attendanceDays.length, 1)),
        attendanceRate: percentage(attendanceDays.length, 22),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  const departmentStats = Array.from(
    users.reduce((map, user) => {
      const department = user.department?.name ?? "Unassigned";
      const current = map.get(department) ?? { name: department, attended: 0, possible: 0, overtimeMinutes: 0 };
      current.attended += user.attendance.filter((entry) => entry.status !== AttendanceStatus.ABSENT).length;
      current.possible += 22;
      current.overtimeMinutes += user.attendance.reduce((sum, entry) => sum + entry.overtimeMinutes, 0);
      map.set(department, current);
      return map;
    }, new Map<string, { name: string; attended: number; possible: number; overtimeMinutes: number }>())
      .values(),
  ).map((item) => ({
    ...item,
    attendanceRate: percentage(item.attended, item.possible),
  }));

  const predictedLate = users
    .map((user) => {
      const recent = user.attendance.slice(-10);
      const lateRecent = recent.filter((entry) => entry.lateMinutes > 0).length;
      return {
        name: user.name,
        department: user.department?.name ?? "Unassigned",
        riskScore: percentage(lateRecent, Math.max(recent.length, 1)),
      };
    })
    .filter((user) => user.riskScore >= 30)
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, 5);

  const staffingSuggestions = departmentStats
    .filter((department) => department.overtimeMinutes / Math.max(department.attended, 1) > 45)
    .map((department) => ({
      department: department.name,
      suggestion: `Consider additional shift coverage in ${department.name}; overtime intensity is elevated.`,
    }));

  return {
    lateEmployees,
    consistentEmployees,
    departmentStats,
    predictedLate,
    staffingSuggestions,
  };
}
