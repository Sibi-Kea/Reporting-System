"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";

export function DashboardTrendChart({
  title,
  data,
  valueLabel,
}: {
  title: string;
  data: Array<{
    label: string;
    value: number;
  }>;
  valueLabel: string;
}) {
  const hydrated = useHydrated();

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] pt-0">
        {hydrated ? (
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="dashboardTrendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#5b7cfa" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#5b7cfa" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(value) => [String(value ?? 0), valueLabel]} />
              <Area
                dataKey="value"
                fill="url(#dashboardTrendFill)"
                isAnimationActive={false}
                stroke="#5b7cfa"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full animate-pulse rounded-[24px] bg-secondary/40" />
        )}
      </CardContent>
    </Card>
  );
}
