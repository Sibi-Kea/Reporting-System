import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { createOfficeLocation, listOfficeLocations } from "@/services/security-service";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locations = await listOfficeLocations(session.user.companyId);
  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const location = await createOfficeLocation(session.user.companyId, session.user.id, await request.json());
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create office location." },
      { status: 400 },
    );
  }
}
