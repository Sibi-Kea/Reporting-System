import { NextResponse } from "next/server";
import { getReceptionDashboardState } from "@/services/reception-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const state = await getReceptionDashboardState({
      companySlug: searchParams.get("company") ?? "",
      codeId: searchParams.get("code") ?? undefined,
    });
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load reception dashboard." },
      { status: 400 },
    );
  }
}
