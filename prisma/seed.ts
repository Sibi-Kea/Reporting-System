import { AuditAction, CompanyStatus, GpsEnforcementMode, PrismaClient, Role, ShiftType, SubscriptionPlan } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const companyName = process.env.BOOTSTRAP_COMPANY_NAME ?? "WorkTrack Pro";
  const companySlug = (process.env.BOOTSTRAP_COMPANY_SLUG ?? process.env.DEMO_COMPANY_SLUG ?? "worktrack-pro").toLowerCase();
  const timezone = process.env.APP_TIMEZONE ?? "Africa/Johannesburg";
  const superAdminName = process.env.BOOTSTRAP_SUPERADMIN_NAME ?? "System Owner";
  const superAdminEmail = (process.env.BOOTSTRAP_SUPERADMIN_EMAIL ?? "superadmin@worktrackpro.com").toLowerCase();
  const superAdminPassword = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD ?? "Password123!";
  const passwordHash = await bcrypt.hash(superAdminPassword, 10);
  const departmentId = `${companySlug}-administration`;
  const shiftId = `${companySlug}-general-day-shift`;

  const company = await prisma.company.upsert({
    where: {
      slug: companySlug,
    },
    update: {
      name: companyName,
      logoUrl: null,
      publicLoginDefault: true,
      timezone,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      status: CompanyStatus.ACTIVE,
      gpsEnforced: false,
      allowRemoteClocking: true,
      ipAllowlist: [],
      clockingRules: {
        shiftStart: "08:00",
        shiftEnd: "17:00",
        lateAfter: "08:10",
      },
    },
    create: {
      name: companyName,
      slug: companySlug,
      logoUrl: null,
      publicLoginDefault: true,
      timezone,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      status: CompanyStatus.ACTIVE,
      gpsEnforced: false,
      allowRemoteClocking: true,
      ipAllowlist: [],
      clockingRules: {
        shiftStart: "08:00",
        shiftEnd: "17:00",
        lateAfter: "08:10",
      },
    },
  });

  const department = await prisma.department.upsert({
    where: {
      id: departmentId,
    },
    update: {
      companyId: company.id,
      name: "Administration",
      description: "Default administration department",
    },
    create: {
      id: departmentId,
      companyId: company.id,
      name: "Administration",
      description: "Default administration department",
    },
  });

  await prisma.shift.upsert({
    where: {
      id: shiftId,
    },
    update: {
      companyId: company.id,
      name: "General Day Shift",
      type: ShiftType.DAY,
      startTime: "08:00",
      endTime: "17:00",
      lateAfter: "08:10",
      overtimeAfterMinutes: 540,
      workDays: [1, 2, 3, 4, 5],
    },
    create: {
      id: shiftId,
      companyId: company.id,
      name: "General Day Shift",
      type: ShiftType.DAY,
      startTime: "08:00",
      endTime: "17:00",
      lateAfter: "08:10",
      overtimeAfterMinutes: 540,
      workDays: [1, 2, 3, 4, 5],
    },
  });

  const user = await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: superAdminEmail,
      },
    },
    update: {
      departmentId: department.id,
      name: superAdminName,
      password: passwordHash,
      employeeId: "ADMIN-0001",
      position: "Super Admin",
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      companyId: company.id,
      departmentId: department.id,
      name: superAdminName,
      email: superAdminEmail,
      password: passwordHash,
      employeeId: "ADMIN-0001",
      position: "Super Admin",
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  await prisma.systemSetting.upsert({
    where: {
      companyId: company.id,
    },
    update: {
      defaultTimezone: timezone,
      quickClockEnabled: false,
      quickClockRequirePin: true,
      gpsEnforced: false,
      gpsEnforcementMode: GpsEnforcementMode.MARK_REMOTE,
      allowRemoteClocking: true,
      qrClockingEnabled: false,
      qrRotationMinutes: 5,
      faceClockingEnabled: false,
      faceMatchThreshold: 0.92,
      enforceClockWindows: false,
      clockInWindowStart: "06:00",
      clockInWindowEnd: "11:00",
      clockOutWindowStart: "15:00",
      clockOutWindowEnd: "23:30",
      lateThresholdMinutes: 10,
      overtimeAfterMinutes: 540,
      shiftReminderMinutes: 30,
      clockOutReminderMinutes: 20,
      clockInGraceMinutes: 10,
      ipAllowlist: [],
      notificationPreferences: {
        shiftReminder: true,
        lateWarning: true,
        clockOutReminder: true,
      },
      updatedById: user.id,
    },
    create: {
      companyId: company.id,
      defaultTimezone: timezone,
      quickClockEnabled: false,
      quickClockRequirePin: true,
      gpsEnforced: false,
      gpsEnforcementMode: GpsEnforcementMode.MARK_REMOTE,
      allowRemoteClocking: true,
      qrClockingEnabled: false,
      qrRotationMinutes: 5,
      faceClockingEnabled: false,
      faceMatchThreshold: 0.92,
      enforceClockWindows: false,
      clockInWindowStart: "06:00",
      clockInWindowEnd: "11:00",
      clockOutWindowStart: "15:00",
      clockOutWindowEnd: "23:30",
      lateThresholdMinutes: 10,
      overtimeAfterMinutes: 540,
      shiftReminderMinutes: 30,
      clockOutReminderMinutes: 20,
      clockInGraceMinutes: 10,
      ipAllowlist: [],
      notificationPreferences: {
        shiftReminder: true,
        lateWarning: true,
        clockOutReminder: true,
      },
      updatedById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: user.id,
      action: AuditAction.CREATE,
      entity: "bootstrap-seed",
      metadata: {
        companyName,
        companySlug,
        superAdminEmail,
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        company: {
          name: company.name,
          slug: company.slug,
        },
        superAdmin: {
          name: user.name,
          email: user.email,
          password: superAdminPassword,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
