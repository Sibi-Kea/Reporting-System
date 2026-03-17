import { Role } from "@prisma/client";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "month";
  const start =
    period === "week" ? startOfWeek(new Date(), { weekStartsOn: 1 }) : startOfMonth(new Date());
  const end = period === "week" ? endOfWeek(new Date(), { weekStartsOn: 1 }) : endOfMonth(new Date());

  const attendance = await prisma.attendance.findMany({
    where: {
      companyId: session.user.companyId,
      ...(hasMinimumRole(session.user.role, Role.MANAGER) ? {} : { userId: session.user.id }),
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      user: {
        include: {
          department: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  return NextResponse.json(attendance);
}
