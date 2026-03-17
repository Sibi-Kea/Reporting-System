import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tenantHasFeature } from "@/lib/tenant";
import { companySchema, departmentSchema, settingsSchema } from "@/lib/validations";
import { logAudit } from "@/services/audit-service";

export async function getWorkspaceSettings(companyId: string) {
  const [company, settings, departments, shifts, officeLocations, qrClockCodes, auditLogs] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
    }),
    prisma.systemSetting.findUnique({
      where: { companyId },
    }),
    prisma.department.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    prisma.shift.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.officeLocation.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.qrClockCode.findMany({
      where: { companyId },
      include: {
        officeLocation: true,
        department: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { companyId },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
      },
    }),
  ]);

  return { company, settings, departments, shifts, officeLocations, qrClockCodes, auditLogs };
}

export async function getPublicLoginCompany(preferredSlug?: string) {
  if (preferredSlug) {
    const preferredCompany = await prisma.company.findFirst({
      where: {
        slug: preferredSlug.toLowerCase(),
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        settings: {
          select: {
            quickClockEnabled: true,
          },
        },
      },
    });

    if (preferredCompany) {
      return preferredCompany;
    }
  }

  const defaultCompany = await prisma.company.findFirst({
    where: {
      publicLoginDefault: true,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      settings: {
        select: {
          quickClockEnabled: true,
        },
      },
    },
  });

  if (defaultCompany) {
    return defaultCompany;
  }

  return prisma.company.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      settings: {
        select: {
          quickClockEnabled: true,
        },
      },
    },
  });
}

export async function updateWorkspaceSettings(companyId: string, actorId: string, actorRole: Role, payload: unknown) {
  const data = settingsSchema.parse(payload);
  const companyContext = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      publicLoginDefault: true,
    },
  });

  if (!companyContext) {
    throw new Error("Company not found.");
  }

  const canUseGps = tenantHasFeature(companyContext.subscriptionPlan, "gps");
  const canUseQr = tenantHasFeature(companyContext.subscriptionPlan, "qr");
  const canUseFace = tenantHasFeature(companyContext.subscriptionPlan, "face");

  const nextGpsEnforced = canUseGps ? data.gpsEnforced : false;
  const nextGpsEnforcementMode = canUseGps ? data.gpsEnforcementMode : "MARK_REMOTE";
  const nextAllowRemoteClocking = canUseGps ? data.allowRemoteClocking : true;
  const nextQrClockingEnabled = canUseQr ? data.qrClockingEnabled : false;
  const nextQrRotationMinutes = canUseQr ? data.qrRotationMinutes : 5;
  const nextFaceClockingEnabled = canUseFace ? data.faceClockingEnabled : false;
  const nextFaceMatchThreshold = canUseFace ? data.faceMatchThreshold : 0.92;
  const nextQuickClockEnabled = data.quickClockEnabled;
  const nextQuickClockRequirePin = data.quickClockRequirePin;
  const nextEnforceClockWindows = data.enforceClockWindows;
  const canManagePublicLogin = actorRole === Role.SUPER_ADMIN;
  const nextPublicLoginDefault = canManagePublicLogin ? data.publicLoginDefault : companyContext.publicLoginDefault;

  if (canManagePublicLogin && nextPublicLoginDefault) {
    await prisma.company.updateMany({
      where: {
        publicLoginDefault: true,
        NOT: {
          id: companyId,
        },
      },
      data: {
        publicLoginDefault: false,
      },
    });
  }

  const [company, settings] = await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.companyName,
        logoUrl: data.logoUrl || null,
        publicLoginDefault: nextPublicLoginDefault,
        timezone: data.timezone,
        gpsEnforced: nextGpsEnforced,
        allowRemoteClocking: nextAllowRemoteClocking,
        ipAllowlist: data.ipAllowlist,
      },
    }),
    prisma.systemSetting.upsert({
      where: { companyId },
      update: {
        defaultTimezone: data.timezone,
        quickClockEnabled: nextQuickClockEnabled,
        quickClockRequirePin: nextQuickClockRequirePin,
        gpsEnforced: nextGpsEnforced,
        gpsEnforcementMode: nextGpsEnforcementMode,
        allowRemoteClocking: nextAllowRemoteClocking,
        qrClockingEnabled: nextQrClockingEnabled,
        qrRotationMinutes: nextQrRotationMinutes,
        faceClockingEnabled: nextFaceClockingEnabled,
        faceMatchThreshold: nextFaceMatchThreshold,
        enforceClockWindows: nextEnforceClockWindows,
        clockInWindowStart: data.clockInWindowStart,
        clockInWindowEnd: data.clockInWindowEnd,
        clockOutWindowStart: data.clockOutWindowStart,
        clockOutWindowEnd: data.clockOutWindowEnd,
        lateThresholdMinutes: data.lateThresholdMinutes,
        overtimeAfterMinutes: data.overtimeAfterMinutes,
        shiftReminderMinutes: data.shiftReminderMinutes,
        clockOutReminderMinutes: data.clockOutReminderMinutes,
        clockInGraceMinutes: data.clockInGraceMinutes,
        ipAllowlist: data.ipAllowlist,
        updatedById: actorId,
      },
      create: {
        companyId,
        defaultTimezone: data.timezone,
        quickClockEnabled: nextQuickClockEnabled,
        quickClockRequirePin: nextQuickClockRequirePin,
        gpsEnforced: nextGpsEnforced,
        gpsEnforcementMode: nextGpsEnforcementMode,
        allowRemoteClocking: nextAllowRemoteClocking,
        qrClockingEnabled: nextQrClockingEnabled,
        qrRotationMinutes: nextQrRotationMinutes,
        faceClockingEnabled: nextFaceClockingEnabled,
        faceMatchThreshold: nextFaceMatchThreshold,
        enforceClockWindows: nextEnforceClockWindows,
        clockInWindowStart: data.clockInWindowStart,
        clockInWindowEnd: data.clockInWindowEnd,
        clockOutWindowStart: data.clockOutWindowStart,
        clockOutWindowEnd: data.clockOutWindowEnd,
        lateThresholdMinutes: data.lateThresholdMinutes,
        overtimeAfterMinutes: data.overtimeAfterMinutes,
        shiftReminderMinutes: data.shiftReminderMinutes,
        clockOutReminderMinutes: data.clockOutReminderMinutes,
        clockInGraceMinutes: data.clockInGraceMinutes,
        ipAllowlist: data.ipAllowlist,
        updatedById: actorId,
      },
    }),
  ]);

  await logAudit({
    companyId,
    userId: actorId,
    action: "SETTINGS_UPDATE",
    entity: "settings",
    entityId: settings.id,
    metadata: {
      timezone: data.timezone,
      publicLoginDefault: nextPublicLoginDefault,
      quickClockEnabled: nextQuickClockEnabled,
      quickClockRequirePin: nextQuickClockRequirePin,
      gpsEnforced: nextGpsEnforced,
      gpsEnforcementMode: nextGpsEnforcementMode,
      qrClockingEnabled: nextQrClockingEnabled,
      faceClockingEnabled: nextFaceClockingEnabled,
      enforceClockWindows: nextEnforceClockWindows,
      clockInWindowStart: data.clockInWindowStart,
      clockInWindowEnd: data.clockInWindowEnd,
      clockOutWindowStart: data.clockOutWindowStart,
      clockOutWindowEnd: data.clockOutWindowEnd,
    },
  });

  return { company, settings };
}

export async function createDepartment(companyId: string, actorId: string, payload: unknown) {
  const data = departmentSchema.parse(payload);

  const department = await prisma.department.create({
    data: {
      companyId,
      name: data.name,
      description: data.description,
    },
  });

  await logAudit({
    companyId,
    userId: actorId,
    action: "CREATE",
    entity: "department",
    entityId: department.id,
    metadata: {
      name: department.name,
    },
  });

  return department;
}

export async function listCompanies() {
  return prisma.company.findMany({
    orderBy: {
      createdAt: "asc",
    },
    include: {
      _count: {
        select: {
          users: true,
          departments: true,
          officeLocations: true,
        },
      },
    },
  });
}

export async function createCompany(actorId: string, payload: unknown) {
  const data = companySchema.parse(payload);
  const existingPublicDefault = await prisma.company.count({
    where: {
      publicLoginDefault: true,
    },
  });

  const company = await prisma.company.create({
    data: {
      name: data.name,
      slug: data.slug,
      timezone: data.timezone,
      logoUrl: data.logoUrl || null,
      publicLoginDefault: existingPublicDefault === 0,
      subscriptionPlan: data.subscriptionPlan,
      status: data.status,
      ipAllowlist: [],
      allowRemoteClocking: true,
      gpsEnforced: false,
    },
  });

  await prisma.systemSetting.create({
    data: {
      companyId: company.id,
      defaultTimezone: data.timezone,
      qrClockingEnabled: data.subscriptionPlan !== "STARTER",
      faceClockingEnabled: data.subscriptionPlan === "PREMIUM",
      gpsEnforcementMode: "MARK_REMOTE",
      quickClockEnabled: false,
      quickClockRequirePin: true,
      enforceClockWindows: false,
      clockInWindowStart: "06:00",
      clockInWindowEnd: "11:00",
      clockOutWindowStart: "15:00",
      clockOutWindowEnd: "23:30",
      ipAllowlist: [],
      updatedById: actorId,
    },
  });

  await logAudit({
    companyId: company.id,
    userId: actorId,
    action: "CREATE",
    entity: "company",
    entityId: company.id,
    metadata: {
      name: company.name,
      slug: company.slug,
    },
  });

  return company;
}

export async function updateCompany(companyId: string, actorId: string, payload: unknown) {
  const data = companySchema.partial().parse(payload);

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.name,
      slug: data.slug,
      timezone: data.timezone,
      logoUrl: data.logoUrl || null,
      subscriptionPlan: data.subscriptionPlan,
      status: data.status,
    },
  });

  if (data.timezone || data.subscriptionPlan) {
    await prisma.systemSetting.upsert({
      where: { companyId },
      update: {
        defaultTimezone: data.timezone ?? undefined,
        qrClockingEnabled: data.subscriptionPlan ? data.subscriptionPlan !== "STARTER" : undefined,
        faceClockingEnabled: data.subscriptionPlan ? data.subscriptionPlan === "PREMIUM" : undefined,
        updatedById: actorId,
      },
      create: {
        companyId,
        defaultTimezone: data.timezone ?? "Africa/Johannesburg",
        qrClockingEnabled: data.subscriptionPlan ? data.subscriptionPlan !== "STARTER" : false,
        faceClockingEnabled: data.subscriptionPlan ? data.subscriptionPlan === "PREMIUM" : false,
        gpsEnforcementMode: "MARK_REMOTE",
        quickClockEnabled: false,
        quickClockRequirePin: true,
        enforceClockWindows: false,
        clockInWindowStart: "06:00",
        clockInWindowEnd: "11:00",
        clockOutWindowStart: "15:00",
        clockOutWindowEnd: "23:30",
        ipAllowlist: [],
        updatedById: actorId,
      },
    });
  }

  await logAudit({
    companyId,
    userId: actorId,
    action: "UPDATE",
    entity: "company",
    entityId: company.id,
    metadata: {
      name: company.name,
      slug: company.slug,
    },
  });

  return company;
}

export async function deleteCompany(companyId: string, actorId: string) {
  await logAudit({
    companyId,
    userId: actorId,
    action: "DELETE",
    entity: "company",
    entityId: companyId,
  });

  return prisma.company.delete({
    where: {
      id: companyId,
    },
  });
}
