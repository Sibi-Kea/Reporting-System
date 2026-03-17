import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { minutesToHoursLabel } from "@/lib/utils";

const statusMap = {
  CLOCKED_IN: "warning",
  COMPLETED: "success",
  LATE: "warning",
  ABSENT: "destructive",
  ON_LEAVE: "secondary",
} as const;

export function AttendanceCalendar({
  entries,
}: {
  entries: {
    date: Date;
    status: keyof typeof statusMap;
    totalMinutes: number;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance calendar</CardTitle>
        <CardDescription>Month-to-date worked days, exceptions, and completed hours.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.length ? (
            entries.map((entry) => (
              <div key={entry.date.toISOString()} className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{format(entry.date, "EEE, dd MMM")}</p>
                  <Badge variant={statusMap[entry.status]}>{entry.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{minutesToHoursLabel(entry.totalMinutes)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No attendance records in the selected period.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
