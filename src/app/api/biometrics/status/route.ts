import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile =
    session.user.role === Role.EMPLOYEE
      ? await prisma.biometricProfile.findUnique({
          where: {
            userId: session.user.id,
          },
        })
      : null;

  const employeeCount = hasMinimumRole(session.user.role, Role.ADMIN)
    ? await prisma.biometricProfile.count({
        where: {
          companyId: session.user.companyId,
          isActive: true,
        },
      })
    : null;

  return NextResponse.json({
    enrolled: Boolean(profile?.encryptedTemplate),
    profile,
    employeeCount,
  });
}
