"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";

export function AttendanceOverviewChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: {
    label: string;
    hours: number;
    overtime: number;
  }[];
}) {
  const hydrated = useHydrated();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pt-2">
        {hydrated ? (
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="hoursGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="overtimeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <Tooltip />
              <Area dataKey="hours" fill="url(#hoursGradient)" isAnimationActive={false} stroke="#2563eb" strokeWidth={2.5} />
              <Area dataKey="overtime" fill="url(#overtimeGradient)" isAnimationActive={false} stroke="#06b6d4" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full animate-pulse rounded-[24px] bg-secondary/40" />
        )}
      </CardContent>
    </Card>
  );
}
