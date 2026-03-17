import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { exportReport, getMonthlyReportData } from "@/services/report-service";

export async function GET(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user || !hasMinimumRole(session.user.role, Role.MANAGER)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const departmentId = searchParams.get("departmentId") ?? undefined;
  const format = (searchParams.get("format") ?? "json") as "json" | "csv" | "xlsx" | "pdf";

  try {
    if (format === "json") {
      const report = await getMonthlyReportData({
        actorId: session.user.id,
        actorRole: session.user.role,
        companyId: session.user.companyId,
        month,
        year,
        departmentId,
      });

      return NextResponse.json(report);
    }

    const exported = await exportReport({
      actorId: session.user.id,
      actorRole: session.user.role,
      companyId: session.user.companyId,
      month,
      year,
      departmentId,
      format,
    });

    return new Response(new Uint8Array(exported.buffer), {
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate report." },
      { status: 400 },
    );
  }
}
