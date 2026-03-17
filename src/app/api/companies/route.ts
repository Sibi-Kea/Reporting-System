import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { listCompanies, createCompany } from "@/services/settings-service";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await listCompanies();
  return NextResponse.json(companies);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const company = await createCompany(session.user.id, await request.json());
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create company." },
      { status: 400 },
    );
  }
}
