import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { updateOfficeLocation } from "@/services/security-service";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const location = await updateOfficeLocation(params.id, session.user.companyId, session.user.id, await request.json());
    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update office location." },
      { status: 400 },
    );
  }
}
