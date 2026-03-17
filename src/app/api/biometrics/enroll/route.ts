import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { enrollBiometric } from "@/services/security-service";

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await enrollBiometric(session.user.id, await request.json());
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to enroll biometric profile." },
      { status: 400 },
    );
  }
}
