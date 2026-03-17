"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";

export function AttendanceInsightsChart({
  data,
}: {
  data: Array<{
    label: string;
    attendanceRate: number;
    overtimeHours: number;
  }>;
}) {
  const hydrated = useHydrated();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department attendance</CardTitle>
        <CardDescription>Attendance rate versus overtime intensity across departments in the past 30 days.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] pt-2">
        {hydrated ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="attendanceRate" fill="#0f766e" isAnimationActive={false} name="Attendance %" radius={[10, 10, 0, 0]} />
              <Bar dataKey="overtimeHours" fill="#2563eb" isAnimationActive={false} name="Overtime hours" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full animate-pulse rounded-[24px] bg-secondary/40" />
        )}
      </CardContent>
    </Card>
  );
}
