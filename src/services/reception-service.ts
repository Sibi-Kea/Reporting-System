import { CompanyStatus, Role } from "@prisma/client";
import { getClockWindowLabel, getClockWindowMode } from "@/lib/clock-rules";
import { prisma } from "@/lib/prisma";
import { hashStaffCodeLookup } from "@/lib/staff-code";
import { receptionDoorClockSchema, receptionQuerySchema } from "@/lib/validations";
import { clockIn, clockOut, getCurrentAttendance, getManagerDashboardData } from "@/services/attendance-service";
import { issueQrClockCode } from "@/services/security-service";

function getReceptionModeCopy(mode: "CLOCK_IN" | "CLOCK_OUT" | "FLEX") {
  if (mode === "CLOCK_OUT") {
    return {
      title: "Clock-out window active",
      description: "The reception QR is now in end-of-shift mode. Staff can still scan the same board and the system will complete the correct action automatically.",
    };
  }

  if (mode === "CLOCK_IN") {
    return {
      title: "Clock-in window active",
      description: "Staff can scan the live door QR and finish attendance with their staff code only.",
    };
  }

  return {
    title: "Flexible clocking mode",
    description: "Clock windows are not currently active. The system will still decide whether each employee should clock in or clock out.",
  };
}

async function resolveReceptionContext(payload: unknown) {
  const parsed = receptionQuerySchema.parse(payload);
  const company = await prisma.company.findFirst({
    where: {
      slug: parsed.companySlug.toLowerCase(),
      status: CompanyStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      timezone: true,
      settings: {
        select: {
          qrClockingEnabled: true,
          qrRotationMinutes: true,
          enforceClockWindows: true,
          clockInWindowStart: true,
          clockInWindowEnd: true,
          clockOutWindowStart: true,
          clockOutWindowEnd: true,
          defaultTimezone: true,
        },
      },
    },
  });

  if (!company) {
    throw new Error("Reception dashboard is not available for this company.");
  }

  if (!company.settings?.qrClockingEnabled) {
    throw new Error("QR reception mode is disabled for this company.");
  }

  const qrCode = await prisma.qrClockCode.findFirst({
    where: {
      companyId: company.id,
      isActive: true,
      ...(parsed.codeId ? { id: parsed.codeId } : {}),
    },
    include: {
      officeLocation: true,
      department: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!qrCode) {
    throw new Error("No active reception QR access point is configured.");
  }

  return {
    company,
    qrCode,
  };
}

export async function getReceptionDashboardState(payload: unknown) {
  const context = await resolveReceptionContext(payload);
  const issued = await issueQrClockCode(context.company.id, context.qrCode.id);
  const managerData = await getManagerDashboardData(context.company.id, context.company.id, Role.ADMIN);
  const timezone = context.company.settings?.defaultTimezone ?? context.company.timezone;
  const mode = getClockWindowMode({
    timezone,
    settings: context.company.settings,
  });
  const modeCopy = getReceptionModeCopy(mode);

  return {
    company: {
      id: context.company.id,
      name: context.company.name,
      slug: context.company.slug,
      logoUrl: context.company.logoUrl,
      timezone,
    },
    qrCode: {
      id: context.qrCode.id,
      label: context.qrCode.label,
      officeLocationName: context.qrCode.officeLocation.name,
      departmentName: context.qrCode.department?.name ?? null,
      rotationMinutes: context.qrCode.rotationMinutes,
    },
    metrics: managerData.metrics,
    mode,
    modeTitle: modeCopy.title,
    modeDescription: modeCopy.description,
    qrToken: issued.token,
    doorPath: `/door?company=${encodeURIComponent(context.company.slug)}&token=${encodeURIComponent(issued.token)}&mode=${mode.toLowerCase()}`,
    expiresAt: issued.expiresAt,
    windows: {
      clockIn: getClockWindowLabel(
        context.company.settings?.clockInWindowStart ?? "06:00",
        context.company.settings?.clockInWindowEnd ?? "11:00",
      ),
      clockOut: getClockWindowLabel(
        context.company.settings?.clockOutWindowStart ?? "15:00",
        context.company.settings?.clockOutWindowEnd ?? "23:30",
      ),
    },
  };
}

export async function performReceptionDoorClock(payload: unknown) {
  const parsed = receptionDoorClockSchema.parse(payload);
  const company = await prisma.company.findFirst({
    where: {
      slug: parsed.companySlug.toLowerCase(),
      status: CompanyStatus.ACTIVE,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!company) {
    throw new Error("Company is not available for reception clocking.");
  }

  const user = await prisma.user.findFirst({
    where: {
      companyId: company.id,
      role: Role.EMPLOYEE,
      isActive: true,
      staffCodeLookup: hashStaffCodeLookup(parsed.staffCode),
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
    },
  });

  if (!user) {
    throw new Error("Invalid staff code.");
  }

  const currentAttendance = await getCurrentAttendance(user.id);
  const action = currentAttendance?.clockIn && !currentAttendance.clockOut ? "CLOCK_OUT" : "CLOCK_IN";
  const attendance =
    action === "CLOCK_OUT"
      ? await clockOut({
          userId: user.id,
          device: parsed.device,
          verificationMethod: "QR",
          qrToken: parsed.qrToken,
        })
      : await clockIn({
          userId: user.id,
          device: parsed.device,
          verificationMethod: "QR",
          qrToken: parsed.qrToken,
        });

  return {
    action,
    company,
    employee: {
      id: user.id,
      name: user.name,
      employeeId: user.employeeId,
    },
    attendance,
  };
}
