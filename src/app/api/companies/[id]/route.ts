import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { deleteCompany, updateCompany } from "@/services/settings-service";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const company = await updateCompany(params.id, session.user.id, await request.json());
    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update company." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const company = await deleteCompany(params.id, session.user.id);
    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete company." },
      { status: 400 },
    );
  }
}
