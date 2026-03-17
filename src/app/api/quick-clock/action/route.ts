import { NextResponse } from "next/server";
import { getRequestErrorMessage } from "@/lib/api-error";
import { performQuickClockAction } from "@/services/quick-clock-service";

export async function POST(request: Request) {
  try {
    const result = await performQuickClockAction(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: getRequestErrorMessage(error, "Unable to complete quick clock action.") },
      { status: 400 },
    );
  }
}
