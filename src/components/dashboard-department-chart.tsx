"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";

const palette = ["#5665e8", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#3b82f6"];

export function DashboardDepartmentChart({
  data,
}: {
  data: Array<{
    label: string;
    value: number;
  }>;
}) {
  const hydrated = useHydrated();

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <CardTitle>Department Overview</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] pt-0">
        {hydrated ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(value) => [String(value ?? 0), "Attendance %"]} />
              <Bar dataKey="value" isAnimationActive={false} radius={[10, 10, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell fill={palette[index % palette.length]} key={entry.label} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full animate-pulse rounded-[24px] bg-secondary/40" />
        )}
      </CardContent>
    </Card>
  );
}
