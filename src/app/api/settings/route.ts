import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/services/settings-service";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getWorkspaceSettings(session.user.companyId);
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await updateWorkspaceSettings(session.user.companyId, session.user.id, session.user.role, await request.json());
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update settings." },
      { status: 400 },
    );
  }
}
