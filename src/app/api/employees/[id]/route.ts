import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { updateEmployee } from "@/services/employee-service";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    const employee = await updateEmployee(params.id, session.user.companyId, session.user.id, body);
    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update employee." },
      { status: 400 },
    );
  }
}
