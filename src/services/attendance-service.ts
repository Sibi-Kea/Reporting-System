import { AttendanceStatus, Prisma, Role, ShiftType, VerificationMethod } from "@prisma/client";
import { differenceInMinutes, endOfMonth, endOfWeek, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { getClockWindowLabel, isTimeWithinClockWindow } from "@/lib/clock-rules";
import { calculateAbsenceDays, calculateAttendanceMetrics, normalizeAttendanceDate } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { evaluateClockLocation, getClockSecurityContext, verifyBiometric, verifyQrClockToken } from "@/services/security-service";

type ClockActionInput = {
  userId: string;
  device: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  shiftType?: ShiftType;
  verificationMethod?: VerificationMethod;
  qrToken?: string;
  biometricVector?: number[];
  livenessPassed?: boolean;
};

const baseAttendanceInclude = {
  shift: true,
  user: {
    include: {
      department: true,
      manager: true,
      shift: true,
    },
  },
} satisfies Prisma.AttendanceInclude;

function assertClockWindowAllowed(options: {
  action: "clock in" | "clock out";
  timezone: string;
  settings: {
    enforceClockWindows: boolean;
    clockInWindowStart: string;
    clockInWindowEnd: string;
    clockOutWindowStart: string;
    clockOutWindowEnd: string;
  } | null;
}) {
  if (!options.settings?.enforceClockWindows) {
    return;
  }

  const start = options.action === "clock in" ? options.settings.clockInWindowStart : options.settings.clockOutWindowStart;
  const end = options.action === "clock in" ? options.settings.clockInWindowEnd : options.settings.clockOutWindowEnd;

  if (
    !isTimeWithinClockWindow({
      timezone: options.timezone,
      start,
      end,
    })
  ) {
    throw new Error(`${options.action === "clock in" ? "Clock in" : "Clock out"} is only allowed between ${getClockWindowLabel(start, end)} (${options.timezone}).`);
  }
}

export async function getCurrentAttendance(userId: string, date = new Date()) {
  return prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId,
        date: normalizeAttendanceDate(date),
      },
    },
    include: baseAttendanceInclude,
  });
}

export async function clockIn(input: ClockActionInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      shift: true,
      company: true,
      biometricProfile: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error("User is not active.");
  }

  const settings = await prisma.systemSetting.findUnique({
    where: { companyId: user.companyId },
    select: {
      enforceClockWindows: true,
      clockInWindowStart: true,
      clockInWindowEnd: true,
      clockOutWindowStart: true,
      clockOutWindowEnd: true,
      defaultTimezone: true,
    },
  });

  assertClockWindowAllowed({
    action: "clock in",
    settings,
    timezone: settings?.defaultTimezone ?? user.company.timezone,
  });

  const verificationMethod = input.verificationMethod ?? VerificationMethod.STANDARD;
  let officeLocationId: string | null = null;
  let qrClockCodeId: string | null = null;
  let withinGeofence: boolean | null = null;
  let remoteClocking = false;
  let biometricVerified = false;
  let livenessPassed = false;
  let faceMatchScore: number | null = null;
  let qrVerified = false;

  if (verificationMethod === VerificationMethod.FACE) {
    if (!input.biometricVector) {
      throw new Error("Biometric scan data is required.");
    }

    const biometricResult = await verifyBiometric(user.id, input.biometricVector, Boolean(input.livenessPassed));
    if (!biometricResult.passed) {
      throw new Error("Face recognition failed.");
    }
    biometricVerified = true;
    livenessPassed = Boolean(input.livenessPassed);
    faceMatchScore = biometricResult.similarity;
  }

  if (verificationMethod === VerificationMethod.QR) {
    if (!input.qrToken) {
      throw new Error("QR token is required.");
    }

    const qrCode = await verifyQrClockToken(user.companyId, input.qrToken);
    officeLocationId = qrCode.officeLocationId;
    qrClockCodeId = qrCode.id;
    qrVerified = true;
    withinGeofence = true;
  } else {
    const locationDecision = await evaluateClockLocation(user.companyId, input.latitude, input.longitude);

    if (!locationDecision.allowed) {
      throw new Error("You are outside the allowed clocking radius.");
    }

    officeLocationId = locationDecision.officeLocation?.id ?? null;
    withinGeofence = locationDecision.officeLocation ? !locationDecision.remote : null;
    remoteClocking = locationDecision.remote;
  }

  const date = normalizeAttendanceDate();
  const existing = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date,
      },
    },
  });

  if (existing?.clockIn && !existing.clockOut) {
    throw new Error("You are already clocked in.");
  }

  if (existing?.clockOut) {
    throw new Error("You have already completed clocking for today.");
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date,
      },
    },
    update: {
      clockIn: new Date(),
      clockOut: null,
      device: input.device,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      shiftType: input.shiftType ?? user.shift?.type ?? ShiftType.DAY,
      status: AttendanceStatus.CLOCKED_IN,
      verificationMethod,
      officeLocationId,
      qrClockCodeId,
      withinGeofence,
      remoteClocking,
      biometricVerified,
      livenessPassed,
      faceMatchScore,
      qrVerified,
    },
    create: {
      companyId: user.companyId,
      userId: user.id,
      shiftId: user.shiftId,
      officeLocationId,
      qrClockCodeId,
      date,
      clockIn: new Date(),
      device: input.device,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      shiftType: input.shiftType ?? user.shift?.type ?? ShiftType.DAY,
      status: AttendanceStatus.CLOCKED_IN,
      verificationMethod,
      withinGeofence,
      remoteClocking,
      biometricVerified,
      livenessPassed,
      faceMatchScore,
      qrVerified,
    },
    include: baseAttendanceInclude,
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "CLOCK_IN",
    entity: "attendance",
    entityId: attendance.id,
    metadata: {
      device: input.device,
      location: input.location,
      verificationMethod,
      officeLocationId,
      remoteClocking,
    },
  });

  return attendance;
}

export async function clockOut(input: ClockActionInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      shift: true,
      company: true,
      biometricProfile: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const settings = await prisma.systemSetting.findUnique({
    where: { companyId: user.companyId },
    select: {
      enforceClockWindows: true,
      clockInWindowStart: true,
      clockInWindowEnd: true,
      clockOutWindowStart: true,
      clockOutWindowEnd: true,
      defaultTimezone: true,
    },
  });

  assertClockWindowAllowed({
    action: "clock out",
    settings,
    timezone: settings?.defaultTimezone ?? user.company.timezone,
  });

  const attendance = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: normalizeAttendanceDate(),
      },
    },
  });

  if (!attendance?.clockIn) {
    throw new Error("You need to clock in first.");
  }

  if (attendance.clockOut) {
    throw new Error("You are already clocked out.");
  }

  const verificationMethod = input.verificationMethod ?? attendance.verificationMethod ?? VerificationMethod.STANDARD;
  let officeLocationId = attendance.officeLocationId;
  let qrClockCodeId = attendance.qrClockCodeId;
  let withinGeofence = attendance.withinGeofence;
  let remoteClocking = attendance.remoteClocking;
  let biometricVerified = attendance.biometricVerified;
  let livenessPassed = attendance.livenessPassed;
  let faceMatchScore = attendance.faceMatchScore;
  let qrVerified = attendance.qrVerified;

  if (verificationMethod === VerificationMethod.FACE) {
    if (!input.biometricVector) {
      throw new Error("Biometric scan data is required.");
    }

    const biometricResult = await verifyBiometric(user.id, input.biometricVector, Boolean(input.livenessPassed));
    if (!biometricResult.passed) {
      throw new Error("Face recognition failed.");
    }
    biometricVerified = true;
    livenessPassed = Boolean(input.livenessPassed);
    faceMatchScore = biometricResult.similarity;
  }

  if (verificationMethod === VerificationMethod.QR) {
    if (!input.qrToken) {
      throw new Error("QR token is required.");
    }

    const qrCode = await verifyQrClockToken(user.companyId, input.qrToken);
    officeLocationId = qrCode.officeLocationId;
    qrClockCodeId = qrCode.id;
    qrVerified = true;
    withinGeofence = true;
    remoteClocking = false;
  } else {
    const locationDecision = await evaluateClockLocation(user.companyId, input.latitude, input.longitude);
    if (!locationDecision.allowed) {
      throw new Error("You are outside the allowed clocking radius.");
    }
    officeLocationId = locationDecision.officeLocation?.id ?? null;
    withinGeofence = locationDecision.officeLocation ? !locationDecision.remote : null;
    remoteClocking = locationDecision.remote;
  }

  const now = new Date();
  const metrics = calculateAttendanceMetrics({
    clockIn: attendance.clockIn,
    clockOut: now,
    shift: {
      startTime: user.shift?.startTime ?? "08:00",
      endTime: user.shift?.endTime ?? "17:00",
      lateAfter: user.shift?.lateAfter ?? "08:10",
      overtimeAfterMinutes: user.shift?.overtimeAfterMinutes ?? 540,
      type: user.shift?.type ?? ShiftType.DAY,
    },
  });

  const updatedAttendance = await prisma.attendance.update({
    where: {
      id: attendance.id,
    },
    data: {
      clockOut: now,
      totalMinutes: metrics.totalMinutes,
      overtimeMinutes: metrics.overtimeMinutes,
      lateMinutes: metrics.lateMinutes,
      earlyLeaveMinutes: metrics.earlyLeaveMinutes,
      status: metrics.status,
      verificationMethod,
      device: input.device,
      location: input.location ?? attendance.location,
      latitude: input.latitude ?? attendance.latitude,
      longitude: input.longitude ?? attendance.longitude,
      officeLocationId,
      qrClockCodeId,
      withinGeofence,
      remoteClocking,
      biometricVerified,
      livenessPassed,
      faceMatchScore,
      qrVerified,
    },
    include: baseAttendanceInclude,
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "CLOCK_OUT",
    entity: "attendance",
    entityId: updatedAttendance.id,
    metadata: {
      totalMinutes: metrics.totalMinutes,
      overtimeMinutes: metrics.overtimeMinutes,
      verificationMethod,
      officeLocationId,
    },
  });

  return updatedAttendance;
}

export async function getEmployeeDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      shift: true,
      department: true,
      manager: true,
      company: true,
      biometricProfile: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const effectiveMonthEnd = today < monthEnd ? today : monthEnd;

  const attendances = await prisma.attendance.findMany({
    where: {
      userId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const todayAttendance = attendances.find((entry) => isSameDay(entry.date, today)) ?? null;
  const weekAttendances = attendances.filter((entry) => entry.date >= weekStart && entry.date <= weekEnd);
  const monthAttendances = attendances.filter((entry) => entry.date >= monthStart && entry.date <= monthEnd);
  const workDays = user.shift?.workDays?.length ? user.shift.workDays : [1, 2, 3, 4, 5];
  const monthAbsences = calculateAbsenceDays(monthAttendances, monthStart, effectiveMonthEnd, workDays);

  const currentMinutes = todayAttendance?.clockIn && !todayAttendance.clockOut ? differenceInMinutes(new Date(), todayAttendance.clockIn) : todayAttendance?.totalMinutes ?? 0;

  return {
    user,
    today: {
      record: todayAttendance,
      currentMinutes: Math.max(0, currentMinutes),
    },
    weeklySummary: {
      totalMinutes: weekAttendances.reduce((sum, entry) => sum + entry.totalMinutes, 0),
      daysAttended: weekAttendances.filter((entry) => entry.status !== AttendanceStatus.ABSENT).length,
      lateArrivals: weekAttendances.filter((entry) => entry.lateMinutes > 0).length,
    },
    monthlySummary: {
      totalMinutes: monthAttendances.reduce((sum, entry) => sum + entry.totalMinutes, 0),
      overtimeMinutes: monthAttendances.reduce((sum, entry) => sum + entry.overtimeMinutes, 0),
      absences: monthAbsences,
    },
    security: await getClockSecurityContext(userId),
    graph: monthAttendances.slice(-7).map((entry) => ({
      date: entry.date,
      totalMinutes: entry.totalMinutes,
      overtimeMinutes: entry.overtimeMinutes,
      lateMinutes: entry.lateMinutes,
    })),
    calendar: monthAttendances.map((entry) => ({
      date: entry.date,
      status: entry.status,
      totalMinutes: entry.totalMinutes,
    })),
  };
}

export async function getManagerDashboardData(companyId: string, actorId: string, role: Role) {
  const userScope =
    role === Role.MANAGER
      ? {
          managerId: actorId,
        }
      : {
          companyId,
          role: {
            in: [Role.EMPLOYEE, Role.MANAGER],
          },
        };

  const users = await prisma.user.findMany({
    where: userScope,
    include: {
      department: true,
      shift: true,
      attendance: {
        where: {
          date: startOfDay(new Date()),
        },
        take: 1,
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const todayAttendance = users.map((user) => ({
    user,
    attendance: user.attendance[0] ?? null,
  }));

  const currentlyClockedIn = todayAttendance.filter((item) => item.attendance?.status === AttendanceStatus.CLOCKED_IN).length;
  const late = todayAttendance.filter((item) => (item.attendance?.lateMinutes ?? 0) > 0).length;
  const absent = todayAttendance.filter((item) => !item.attendance || item.attendance.status === AttendanceStatus.ABSENT).length;

  const trendData = await prisma.attendance.findMany({
    where: {
      companyId,
      date: {
        gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
      },
      userId: {
        in: users.map((user) => user.id),
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return {
    metrics: {
      teamSize: users.length,
      currentlyClockedIn,
      late,
      absent,
      pendingApprovals: todayAttendance.filter((item) => item.attendance?.clockOut && !item.attendance.approvedAt).length,
    },
    team: todayAttendance,
    trend: trendData.map((item) => ({
      date: item.date,
      totalMinutes: item.totalMinutes,
      overtimeMinutes: item.overtimeMinutes,
      lateMinutes: item.lateMinutes,
      status: item.status,
    })),
  };
}
