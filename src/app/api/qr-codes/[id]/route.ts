import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { issueQrClockCode, updateQrClockCode } from "@/services/security-service";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const code = await issueQrClockCode(session.user.companyId, params.id);
    return NextResponse.json(code);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to issue QR code." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const code = await updateQrClockCode(params.id, session.user.companyId, session.user.id, await request.json());
    return NextResponse.json(code);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update QR code." },
      { status: 400 },
    );
  }
}
