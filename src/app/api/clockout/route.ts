import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { clockActionSchema } from "@/lib/validations";
import { clockOut } from "@/services/attendance-service";

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = clockActionSchema.parse(await request.json());
    const attendance = await clockOut({
      userId: session.user.id,
      ...payload,
    });

    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to clock out." },
      { status: 400 },
    );
  }
}
