import { NextResponse } from "next/server";
import { getQuickClockContext } from "@/services/quick-clock-service";

export async function POST(request: Request) {
  try {
    const context = await getQuickClockContext(await request.json());
    return NextResponse.json(context);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to validate quick clock access." },
      { status: 400 },
    );
  }
}
