import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashStaffCodeLookup } from "@/lib/staff-code";
import { employeeSchema } from "@/lib/validations";
import { logAudit } from "@/services/audit-service";

async function validateEmployeeRelations(input: {
  companyId: string;
  employeeId?: string;
  departmentId?: string | null;
  managerId?: string | null;
  shiftId?: string | null;
}) {
  if (input.managerId && input.employeeId && input.managerId === input.employeeId) {
    throw new Error("An employee cannot report to themselves.");
  }

  const [department, manager, shift] = await Promise.all([
    input.departmentId
      ? prisma.department.findFirst({
          where: {
            id: input.departmentId,
            companyId: input.companyId,
          },
        })
      : Promise.resolve(null),
    input.managerId
      ? prisma.user.findFirst({
          where: {
            id: input.managerId,
            companyId: input.companyId,
            isActive: true,
            role: {
              in: [Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN],
            },
          },
        })
      : Promise.resolve(null),
    input.shiftId
      ? prisma.shift.findFirst({
          where: {
            id: input.shiftId,
            companyId: input.companyId,
          },
        })
      : Promise.resolve(null),
  ]);

  if (input.departmentId && !department) {
    throw new Error("Selected department is invalid for this company.");
  }

  if (input.managerId && !manager) {
    throw new Error("Selected manager is invalid for this company.");
  }

  if (input.shiftId && !shift) {
    throw new Error("Selected shift is invalid for this company.");
  }
}

async function validateEmployeeUniqueness(input: {
  companyId: string;
  email: string;
  employeeId: string;
  existingUserId?: string;
}) {
  const conflicts = await prisma.user.findMany({
    where: {
      companyId: input.companyId,
      OR: [{ email: input.email }, { employeeId: input.employeeId }],
      ...(input.existingUserId
        ? {
            NOT: {
              id: input.existingUserId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      employeeId: true,
    },
    take: 2,
  });

  if (conflicts.some((user) => user.email === input.email)) {
    throw new Error("Email already exists in this company.");
  }

  if (conflicts.some((user) => user.employeeId === input.employeeId)) {
    throw new Error("Employee ID already exists in this company.");
  }
}

async function validateStaffCodeUniqueness(input: {
  companyId: string;
  staffCode?: string | null;
  existingUserId?: string;
}) {
  if (!input.staffCode) {
    return;
  }

  const conflict = await prisma.user.findFirst({
    where: {
      companyId: input.companyId,
      staffCodeLookup: hashStaffCodeLookup(input.staffCode),
      role: Role.EMPLOYEE,
      ...(input.existingUserId
        ? {
            NOT: {
              id: input.existingUserId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (conflict) {
    throw new Error("Staff code already exists in this company.");
  }
}

type ListEmployeesInput = {
  companyId: string;
  actorId: string;
  role: Role;
  search?: string;
  departmentId?: string;
  page?: number;
  pageSize?: number;
};

export async function listEmployees(input: ListEmployeesInput) {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 10;

  const where = {
    companyId: input.companyId,
    ...(input.role === Role.MANAGER ? { managerId: input.actorId } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
            { employeeId: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(input.departmentId ? { departmentId: input.departmentId } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        department: true,
        manager: true,
        shift: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}

export async function createEmployee(companyId: string, actorId: string, payload: unknown) {
  const data = employeeSchema.parse(payload);
  const email = data.email.toLowerCase().trim();
  const employeeId = data.employeeId.trim();
  const clockPin = data.clockPin?.trim() || null;

  if (data.role === Role.EMPLOYEE && !clockPin) {
    throw new Error("Employees must have a 4-8 digit staff code.");
  }

  await validateEmployeeRelations({
    companyId,
    departmentId: data.departmentId ?? null,
    managerId: data.managerId ?? null,
    shiftId: data.shiftId ?? null,
  });
  await validateEmployeeUniqueness({
    companyId,
    email,
    employeeId,
  });
  await validateStaffCodeUniqueness({
    companyId,
    staffCode: data.role === Role.EMPLOYEE ? clockPin : null,
  });

  const password = await bcrypt.hash(data.password ?? "Password123!", 10);

  const employee = await prisma.user.create({
    data: {
      companyId,
      name: data.name,
      email,
      password,
      employeeId,
      clockPinHash: clockPin ? await bcrypt.hash(clockPin, 10) : null,
      staffCodeLookup: data.role === Role.EMPLOYEE && clockPin ? hashStaffCodeLookup(clockPin) : null,
      departmentId: data.departmentId ?? null,
      position: data.position || null,
      managerId: data.managerId ?? null,
      shiftId: data.shiftId ?? null,
      role: data.role,
      isActive: data.isActive ?? true,
    },
    include: {
      department: true,
      manager: true,
      shift: true,
    },
  });

  await logAudit({
    companyId,
    userId: actorId,
    action: "CREATE",
    entity: "user",
    entityId: employee.id,
    metadata: {
      role: employee.role,
      email: employee.email,
    },
  });

  return employee;
}

export async function updateEmployee(employeeId: string, companyId: string, actorId: string, payload: unknown) {
  const data = employeeSchema.partial().parse(payload);
  const existing = await prisma.user.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
  });

  if (!existing) {
    throw new Error("Employee not found.");
  }

  const nextEmail = data.email ? data.email.toLowerCase().trim() : existing.email;
  const nextEmployeeId = data.employeeId?.trim() ?? existing.employeeId;
  const nextRole = data.role ?? existing.role;
  const nextClockPin = data.clockPin !== undefined ? data.clockPin.trim() || null : undefined;

  if (nextRole === Role.EMPLOYEE && nextClockPin === null) {
    throw new Error("Employees must keep a staff code.");
  }

  if (nextRole === Role.EMPLOYEE && !existing.clockPinHash && nextClockPin === undefined) {
    throw new Error("Employees must have a 4-8 digit staff code.");
  }

  await validateEmployeeRelations({
    companyId,
    employeeId,
    departmentId: data.departmentId ?? undefined,
    managerId: data.managerId ?? undefined,
    shiftId: data.shiftId ?? undefined,
  });
  await validateEmployeeUniqueness({
    companyId,
    email: nextEmail,
    employeeId: nextEmployeeId,
    existingUserId: employeeId,
  });
  await validateStaffCodeUniqueness({
    companyId,
    staffCode: nextClockPin !== undefined ? nextClockPin : null,
    existingUserId: employeeId,
  });

  const employee = await prisma.user.update({
    where: {
      id: employeeId,
    },
    data: {
      name: data.name,
      email: data.email ? nextEmail : undefined,
      employeeId: data.employeeId ? nextEmployeeId : undefined,
      clockPinHash: nextClockPin !== undefined ? (nextClockPin ? await bcrypt.hash(nextClockPin, 10) : null) : undefined,
      staffCodeLookup:
        nextRole === Role.EMPLOYEE
          ? nextClockPin !== undefined
            ? nextClockPin
              ? hashStaffCodeLookup(nextClockPin)
              : null
            : undefined
          : null,
      departmentId: data.departmentId,
      position: data.position === "" ? null : data.position,
      managerId: data.managerId,
      shiftId: data.shiftId,
      role: data.role,
      isActive: data.isActive,
      ...(data.password ? { password: await bcrypt.hash(data.password, 10) } : {}),
    },
    include: {
      department: true,
      manager: true,
      shift: true,
    },
  });

  await logAudit({
    companyId,
    userId: actorId,
    action: "UPDATE",
    entity: "user",
    entityId: employee.id,
    metadata: {
      role: employee.role,
      email: employee.email,
    },
  });

  return employee;
}
