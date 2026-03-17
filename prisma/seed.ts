import { AttendanceStatus, AuditAction, CompanyStatus, GpsEnforcementMode, PrismaClient, Role, ShiftType, SubscriptionPlan, VerificationMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { addMinutes, setHours, setMinutes, startOfDay, subDays } from "date-fns";
import { hashStaffCodeLookup } from "../src/lib/staff-code";

const prisma = new PrismaClient();
const workDays = [1, 2, 3, 4, 5];

function dateAt(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return setMinutes(setHours(new Date(date), hours), minutes);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function defaultEmployeeAccessCode(employeeId: string) {
  const numericCode = employeeId.replace(/\D/g, "").slice(-4);
  return (numericCode || "1234").padStart(4, "0");
}

async function seedCompany(input: {
  name: string;
  slug: string;
  timezone: string;
  subscriptionPlan: SubscriptionPlan;
  status: CompanyStatus;
  officeLocation: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  users: Array<{
    name: string;
    email: string;
    employeeId: string;
    role: Role;
    position: string;
    department: string;
    avatarUrl?: string;
    managerEmail?: string;
  }>;
}) {
  const company = await prisma.company.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      publicLoginDefault: input.slug === (process.env.DEMO_COMPANY_SLUG ?? "sm-techie"),
      timezone: input.timezone,
      subscriptionPlan: input.subscriptionPlan,
      status: input.status,
    },
    create: {
      name: input.name,
      slug: input.slug,
      publicLoginDefault: input.slug === (process.env.DEMO_COMPANY_SLUG ?? "sm-techie"),
      timezone: input.timezone,
      subscriptionPlan: input.subscriptionPlan,
      status: input.status,
      gpsEnforced: input.subscriptionPlan !== SubscriptionPlan.STARTER,
      allowRemoteClocking: true,
      ipAllowlist: [],
      clockingRules: {
        shiftStart: "08:00",
        shiftEnd: "17:00",
        lateAfter: "08:10",
      },
    },
  });

  const departmentMap = new Map<string, { id: string; name: string }>();

  for (const departmentName of Array.from(new Set(input.users.map((user) => user.department)))) {
    const department = await prisma.department.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: departmentName,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name: departmentName,
        description: `${departmentName} department`,
      },
    });

    departmentMap.set(departmentName, department);
  }

  const dayShift = await prisma.shift.upsert({
    where: { id: `${company.id}-day-shift` },
    update: {},
    create: {
      id: `${company.id}-day-shift`,
      companyId: company.id,
      name: "General Day Shift",
      type: ShiftType.DAY,
      startTime: "08:00",
      endTime: "17:00",
      lateAfter: "08:10",
      overtimeAfterMinutes: 540,
      workDays,
    },
  });

  const officeLocation = await prisma.officeLocation.upsert({
    where: { id: `${company.id}-hq` },
    update: {
      name: input.officeLocation.name,
      address: input.officeLocation.address,
      latitude: input.officeLocation.latitude,
      longitude: input.officeLocation.longitude,
      radiusMeters: input.officeLocation.radiusMeters,
      qrRotationMins: 5,
      isActive: true,
    },
    create: {
      id: `${company.id}-hq`,
      companyId: company.id,
      name: input.officeLocation.name,
      address: input.officeLocation.address,
      latitude: input.officeLocation.latitude,
      longitude: input.officeLocation.longitude,
      radiusMeters: input.officeLocation.radiusMeters,
      qrRotationMins: 5,
      isActive: true,
    },
  });

  const qrSeedToken = `${company.slug}-${officeLocation.id}-seed-token`;
  await prisma.qrClockCode.upsert({
    where: {
      currentTokenHash: hashToken(qrSeedToken),
    },
    update: {
      companyId: company.id,
      officeLocationId: officeLocation.id,
      label: `${officeLocation.name} Main Entry`,
      rotationMinutes: 5,
      lastIssuedAt: new Date(),
      expiresAt: addMinutes(new Date(), 5),
      isActive: true,
    },
    create: {
      companyId: company.id,
      officeLocationId: officeLocation.id,
      label: `${officeLocation.name} Main Entry`,
      rotationMinutes: 5,
      currentTokenHash: hashToken(qrSeedToken),
      lastIssuedAt: new Date(),
      expiresAt: addMinutes(new Date(), 5),
      isActive: true,
    },
  });

  const password = await bcrypt.hash("Password123!", 10);
  const managerIds = new Map<string, string>();

  for (const userInput of input.users) {
    const user = await prisma.user.upsert({
      where: {
        companyId_email: {
          companyId: company.id,
          email: userInput.email.toLowerCase(),
        },
      },
      create: {
        companyId: company.id,
        departmentId: departmentMap.get(userInput.department)?.id,
        shiftId: dayShift.id,
        name: userInput.name,
        email: userInput.email.toLowerCase(),
        password,
        employeeId: userInput.employeeId,
        clockPinHash:
          userInput.role === Role.EMPLOYEE ? await bcrypt.hash(defaultEmployeeAccessCode(userInput.employeeId), 10) : null,
        staffCodeLookup:
          userInput.role === Role.EMPLOYEE ? hashStaffCodeLookup(defaultEmployeeAccessCode(userInput.employeeId)) : null,
        position: userInput.position,
        role: userInput.role,
        avatarUrl: userInput.avatarUrl,
      },
      update: {
        departmentId: departmentMap.get(userInput.department)?.id,
        shiftId: dayShift.id,
        name: userInput.name,
        email: userInput.email.toLowerCase(),
        employeeId: userInput.employeeId,
        position: userInput.position,
        role: userInput.role,
        avatarUrl: userInput.avatarUrl,
        clockPinHash:
          userInput.role === Role.EMPLOYEE ? await bcrypt.hash(defaultEmployeeAccessCode(userInput.employeeId), 10) : null,
        staffCodeLookup:
          userInput.role === Role.EMPLOYEE ? hashStaffCodeLookup(defaultEmployeeAccessCode(userInput.employeeId)) : null,
      },
    });

    if (user.role === Role.MANAGER || user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      managerIds.set(user.email, user.id);
    }
  }

  for (const userInput of input.users) {
    if (!userInput.managerEmail) {
      continue;
    }

    await prisma.user.update({
      where: {
        companyId_email: {
          companyId: company.id,
          email: userInput.email.toLowerCase(),
        },
      },
      data: {
        managerId: managerIds.get(userInput.managerEmail.toLowerCase()) ?? null,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      defaultTimezone: company.timezone,
      gpsEnforced: input.subscriptionPlan !== SubscriptionPlan.STARTER,
      gpsEnforcementMode: GpsEnforcementMode.MARK_REMOTE,
      allowRemoteClocking: true,
      qrClockingEnabled: input.subscriptionPlan !== SubscriptionPlan.STARTER,
      qrRotationMinutes: 5,
      faceClockingEnabled: input.subscriptionPlan === SubscriptionPlan.PREMIUM,
      faceMatchThreshold: 0.92,
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
    },
  });

  const employees = await prisma.user.findMany({
    where: {
      companyId: company.id,
      role: {
        in: [Role.EMPLOYEE, Role.MANAGER],
      },
    },
  });

  const dateRange = Array.from({ length: 21 }, (_, index) => subDays(startOfDay(new Date()), 20 - index));

  for (const employee of employees) {
    for (const day of dateRange) {
      if (!workDays.includes(day.getDay())) {
        continue;
      }

      const lateMinutes =
        employee.email.includes("naledi") && day.getDay() === 1
          ? 18
          : employee.email.includes("daniel")
            ? 7
            : employee.email.includes("driver")
              ? 11
              : 0;
      const overtimeMinutes = employee.role === Role.MANAGER ? 38 : employee.email.includes("sipho") ? 55 : 12;
      const isRemote = company.subscriptionPlan !== SubscriptionPlan.STARTER && employee.email.includes("anele") && day.getDay() === 3;

      const clockIn = addMinutes(dateAt(day, "08:00"), lateMinutes);
      const clockOut = addMinutes(dateAt(day, "17:00"), overtimeMinutes);

      await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: employee.id,
            date: day,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          userId: employee.id,
          shiftId: dayShift.id,
          officeLocationId: isRemote ? null : officeLocation.id,
          date: day,
          clockIn,
          clockOut,
          totalMinutes: 540 + overtimeMinutes - lateMinutes,
          overtimeMinutes,
          lateMinutes,
          earlyLeaveMinutes: 0,
          status: lateMinutes > 10 ? AttendanceStatus.LATE : AttendanceStatus.COMPLETED,
          verificationMethod: VerificationMethod.STANDARD,
          device: "Seeded Mobile App",
          location: isRemote ? "Remote site" : officeLocation.address,
          latitude: isRemote ? officeLocation.latitude + 0.02 : officeLocation.latitude,
          longitude: isRemote ? officeLocation.longitude + 0.02 : officeLocation.longitude,
          withinGeofence: !isRemote,
          remoteClocking: isRemote,
          qrVerified: false,
          biometricVerified: false,
          livenessPassed: false,
          shiftType: ShiftType.DAY,
        },
      });
    }
  }

  return company;
}

async function main() {
  const smTechie = await seedCompany({
    name: "SM Techie",
    slug: process.env.DEMO_COMPANY_SLUG ?? "sm-techie",
    timezone: process.env.APP_TIMEZONE ?? "Africa/Johannesburg",
    subscriptionPlan: SubscriptionPlan.PREMIUM,
    status: CompanyStatus.ACTIVE,
    officeLocation: {
      name: "Johannesburg HQ",
      address: "Rosebank, Johannesburg",
      latitude: -26.1457,
      longitude: 28.0416,
      radiusMeters: 120,
    },
    users: [
      {
        name: "Aisha Mokoena",
        email: "superadmin@smtechie.com",
        employeeId: "SM-0001",
        role: Role.SUPER_ADMIN,
        position: "Super Admin",
        department: "IT",
        avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      },
      {
        name: "Jordan Smith",
        email: "admin@smtechie.com",
        employeeId: "SM-0002",
        role: Role.ADMIN,
        position: "People Operations Admin",
        department: "HR",
        managerEmail: "superadmin@smtechie.com",
      },
      {
        name: "Karabo Dlamini",
        email: "manager.it@smtechie.com",
        employeeId: "SM-0100",
        role: Role.MANAGER,
        position: "IT Manager",
        department: "IT",
        avatarUrl: "https://avatars.githubusercontent.com/u/2?v=4",
      },
      {
        name: "Thandi Naidoo",
        email: "manager.ops@smtechie.com",
        employeeId: "SM-0101",
        role: Role.MANAGER,
        position: "Operations Manager",
        department: "Operations",
        avatarUrl: "https://avatars.githubusercontent.com/u/3?v=4",
      },
      {
        name: "Sipho Khumalo",
        email: "sipho@smtechie.com",
        employeeId: "SM-1001",
        role: Role.EMPLOYEE,
        position: "Frontend Engineer",
        department: "IT",
        managerEmail: "manager.it@smtechie.com",
      },
      {
        name: "Naledi Ncube",
        email: "naledi@smtechie.com",
        employeeId: "SM-1002",
        role: Role.EMPLOYEE,
        position: "QA Analyst",
        department: "IT",
        managerEmail: "manager.it@smtechie.com",
      },
      {
        name: "Lerato Sithole",
        email: "lerato@smtechie.com",
        employeeId: "SM-1003",
        role: Role.EMPLOYEE,
        position: "HR Specialist",
        department: "HR",
        managerEmail: "manager.ops@smtechie.com",
      },
      {
        name: "Daniel Jacobs",
        email: "daniel@smtechie.com",
        employeeId: "SM-1004",
        role: Role.EMPLOYEE,
        position: "Finance Analyst",
        department: "Finance",
        managerEmail: "manager.ops@smtechie.com",
      },
      {
        name: "Precious Molefe",
        email: "precious@smtechie.com",
        employeeId: "SM-1005",
        role: Role.EMPLOYEE,
        position: "Support Lead",
        department: "Support",
        managerEmail: "manager.ops@smtechie.com",
      },
      {
        name: "Anele Mthembu",
        email: "anele@smtechie.com",
        employeeId: "SM-1006",
        role: Role.EMPLOYEE,
        position: "Operations Coordinator",
        department: "Operations",
        managerEmail: "manager.ops@smtechie.com",
      },
    ],
  });

  const acme = await seedCompany({
    name: "Acme Logistics",
    slug: "acme-logistics",
    timezone: "Africa/Johannesburg",
    subscriptionPlan: SubscriptionPlan.GROWTH,
    status: CompanyStatus.ACTIVE,
    officeLocation: {
      name: "Cape Town Hub",
      address: "Foreshore, Cape Town",
      latitude: -33.9182,
      longitude: 18.4233,
      radiusMeters: 150,
    },
    users: [
      {
        name: "Nomsa Daniels",
        email: "admin@acmelogistics.com",
        employeeId: "AC-0001",
        role: Role.ADMIN,
        position: "Operations Admin",
        department: "Operations",
      },
      {
        name: "Michael Driver",
        email: "driver@acmelogistics.com",
        employeeId: "AC-1001",
        role: Role.EMPLOYEE,
        position: "Fleet Driver",
        department: "Operations",
        managerEmail: "admin@acmelogistics.com",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        companyId: smTechie.id,
        userId: (await prisma.user.findFirstOrThrow({ where: { companyId: smTechie.id, email: "manager.it@smtechie.com" } })).id,
        type: "SHIFT_REMINDER",
        title: "Shift reminder",
        body: "Review QR and face policies before the next shift window opens.",
      },
      {
        companyId: acme.id,
        userId: (await prisma.user.findFirstOrThrow({ where: { companyId: acme.id, email: "admin@acmelogistics.com" } })).id,
        type: "SYSTEM",
        title: "Growth plan active",
        body: "GPS verification and QR clocking are enabled for your tenant.",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      companyId: smTechie.id,
      userId: (await prisma.user.findFirstOrThrow({ where: { companyId: smTechie.id, email: "superadmin@smtechie.com" } })).id,
      action: AuditAction.CREATE,
      entity: "seed",
      metadata: {
        message: "Initial multi-tenant demo data seeded",
      },
    },
  });
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
