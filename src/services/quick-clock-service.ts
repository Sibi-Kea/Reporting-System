import bcrypt from "bcryptjs";
import { CompanyStatus } from "@prisma/client";
import { normalizeAttendanceDate } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { quickClockActionSchema, quickClockIdentitySchema } from "@/lib/validations";
import { clockIn, clockOut } from "@/services/attendance-service";

async function resolveQuickClockAccess(payload: unknown) {
  const identity = quickClockIdentitySchema.parse(payload);
  const company = await prisma.company.findUnique({
    where: {
      slug: identity.companySlug.toLowerCase(),
    },
  });

  if (!company || company.status !== CompanyStatus.ACTIVE) {
    throw new Error("Quick clock is not available for this company.");
  }

  const [settings, user] = await Promise.all([
    prisma.systemSetting.findUnique({
      where: { companyId: company.id },
    }),
    prisma.user.findFirst({
      where: {
        companyId: company.id,
        employeeId: identity.employeeId.trim(),
        isActive: true,
      },
      include: {
        shift: true,
        department: true,
      },
    }),
  ]);

  if (!settings?.quickClockEnabled) {
    throw new Error("Quick clock is disabled for this company.");
  }

  if (!user) {
    throw new Error("Employee was not found for quick clock.");
  }

  if (settings.quickClockRequirePin) {
    if (!identity.clockPin || !user.clockPinHash) {
      throw new Error("A valid clock PIN is required.");
    }

    const pinMatches = await bcrypt.compare(identity.clockPin, user.clockPinHash);

    if (!pinMatches) {
      throw new Error("A valid clock PIN is required.");
    }
  }

  const attendance = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: normalizeAttendanceDate(),
      },
    },
  });

  return {
    company,
    settings,
    user,
    attendance,
  };
}

export async function getQuickClockContext(payload: unknown) {
  const context = await resolveQuickClockAccess(payload);

  return {
    company: {
      id: context.company.id,
      name: context.company.name,
      slug: context.company.slug,
      logoUrl: context.company.logoUrl,
    },
    settings: {
      quickClockRequirePin: context.settings.quickClockRequirePin,
      gpsEnforced: context.settings.gpsEnforced,
      allowRemoteClocking: context.settings.allowRemoteClocking,
      enforceClockWindows: context.settings.enforceClockWindows,
      clockInWindowStart: context.settings.clockInWindowStart,
      clockInWindowEnd: context.settings.clockInWindowEnd,
      clockOutWindowStart: context.settings.clockOutWindowStart,
      clockOutWindowEnd: context.settings.clockOutWindowEnd,
    },
    employee: {
      id: context.user.id,
      name: context.user.name,
      employeeId: context.user.employeeId,
      shiftName: context.user.shift?.name ?? "General shift",
      departmentName: context.user.department?.name ?? "Unassigned",
    },
    attendance: context.attendance,
    suggestedAction: context.attendance?.clockIn && !context.attendance.clockOut ? "CLOCK_OUT" : "CLOCK_IN",
  };
}

export async function performQuickClockAction(payload: unknown) {
  const parsed = quickClockActionSchema.parse(payload);
  const context = await resolveQuickClockAccess(parsed);
  const shouldClockOut = Boolean(context.attendance?.clockIn && !context.attendance.clockOut);

  const attendance = shouldClockOut
    ? await clockOut({
        userId: context.user.id,
        device: parsed.device,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        location: parsed.location,
        shiftType: parsed.shiftType,
      })
    : await clockIn({
        userId: context.user.id,
        device: parsed.device,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        location: parsed.location,
        shiftType: parsed.shiftType,
      });

  return {
    action: shouldClockOut ? "CLOCK_OUT" : "CLOCK_IN",
    attendance,
    employee: {
      id: context.user.id,
      name: context.user.name,
      employeeId: context.user.employeeId,
    },
  };
}
