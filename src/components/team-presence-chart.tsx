"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";

const palette = ["#2563eb", "#f59e0b", "#ef4444"];

export function TeamPresenceChart({
  active,
  late,
  absent,
}: {
  active: number;
  late: number;
  absent: number;
}) {
  const hydrated = useHydrated();
  const data = [
    { name: "Clocked In", value: active },
    { name: "Late", value: late },
    { name: "Absent", value: absent },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live team mix</CardTitle>
        <CardDescription>Real-time breakdown of today&apos;s attendance state.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {hydrated ? (
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={70} isAnimationActive={false} outerRadius={105} paddingAngle={5}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={palette[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full animate-pulse rounded-[24px] bg-secondary/40" />
        )}
      </CardContent>
    </Card>
  );
}
