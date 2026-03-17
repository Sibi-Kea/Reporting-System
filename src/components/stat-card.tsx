import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  helper: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("border-transparent", highlight && "bg-slate-950 text-white dark:bg-white dark:text-slate-950")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className={cn("text-sm", highlight ? "text-white/70 dark:text-slate-500" : "text-muted-foreground")}>{label}</p>
          <div className={cn("rounded-full p-2", highlight ? "bg-white/10 dark:bg-slate-900/10" : "bg-primary/10 text-primary")}>
            {icon ?? <ArrowUpRight className="h-4 w-4" />}
          </div>
        </div>
        <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
        <p className={cn("mt-2 text-sm", highlight ? "text-white/70 dark:text-slate-500" : "text-muted-foreground")}>{helper}</p>
      </CardContent>
    </Card>
  );
}
