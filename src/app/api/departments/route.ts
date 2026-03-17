import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createDepartment } from "@/services/settings-service";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departments = await prisma.department.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const department = await createDepartment(session.user.companyId, session.user.id, await request.json());
    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create department." },
      { status: 400 },
    );
  }
}
