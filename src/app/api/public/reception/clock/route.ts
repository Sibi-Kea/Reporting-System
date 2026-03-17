import { NextResponse } from "next/server";
import { performReceptionDoorClock } from "@/services/reception-service";

export async function POST(request: Request) {
  try {
    const result = await performReceptionDoorClock(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete door clock action." },
      { status: 400 },
    );
  }
}
