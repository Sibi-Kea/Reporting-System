import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { createEmployee, listEmployees } from "@/services/employee-service";

export async function GET(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.MANAGER)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const response = await listEmployees({
    actorId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
    search: searchParams.get("search") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
  });

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    const employee = await createEmployee(session.user.companyId, session.user.id, body);
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create employee." },
      { status: 400 },
    );
  }
}
