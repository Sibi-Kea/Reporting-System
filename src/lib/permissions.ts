import { Role } from "@prisma/client";

const rolePriority: Record<Role, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function hasMinimumRole(role: Role, minimum: Role) {
  return rolePriority[role] >= rolePriority[minimum];
}

export function canManagePeople(role: Role) {
  return hasMinimumRole(role, Role.MANAGER);
}

export function canEditSettings(role: Role) {
  return hasMinimumRole(role, Role.ADMIN);
}

export function canManageCompanies(role: Role) {
  return role === Role.SUPER_ADMIN;
}
