"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Role, type SubscriptionPlan } from "@prisma/client";
import { BarChart3, Building2, Clock3, LayoutDashboard, Settings, TrendingUp, Users2 } from "lucide-react";
import { hasMinimumRole } from "@/lib/permissions";
import { tenantHasFeature, type SaaSFeature } from "@/lib/tenant";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard" as Route,
    label: "Dashboard",
    icon: LayoutDashboard,
    minimumRole: "EMPLOYEE" as Role,
  },
  {
    href: "/clock" as Route,
    label: "Clock",
    icon: Clock3,
    minimumRole: "EMPLOYEE" as Role,
  },
  {
    href: "/employees" as Route,
    label: "Employees",
    icon: Users2,
    minimumRole: "MANAGER" as Role,
  },
  {
    href: "/reports" as Route,
    label: "Reports",
    icon: BarChart3,
    minimumRole: "MANAGER" as Role,
  },
  {
    href: "/analytics" as Route,
    label: "Analytics",
    icon: TrendingUp,
    minimumRole: "MANAGER" as Role,
    feature: "insights" as SaaSFeature,
  },
  {
    href: "/settings" as Route,
    label: "Settings",
    icon: Settings,
    minimumRole: "ADMIN" as Role,
  },
];

export function WorkspaceNav({
  role,
  compact = false,
  variant = "default",
  plan,
}: {
  role: Role;
  compact?: boolean;
  variant?: "default" | "sidebar";
  plan?: SubscriptionPlan;
}) {
  const pathname = usePathname();
  const isSidebar = variant === "sidebar";

  return (
    <nav className={cn("flex gap-2", compact ? "overflow-x-auto pb-1" : "flex-col")}>
      {navItems
        .filter((item) => hasMinimumRole(role, item.minimumRole) && (!item.feature || (plan ? tenantHasFeature(plan, item.feature) : false)))
        .map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                compact && "whitespace-nowrap",
                isSidebar &&
                  (active
                    ? "bg-white/[0.15] text-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.9)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"),
                !isSidebar &&
                  (active
                    ? "bg-slate-950 text-white shadow-soft dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-secondary hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"),
                isSidebar && "px-3.5 py-3",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}

export function CompanyRoleBadge({
  role,
  variant = "default",
}: {
  role: Role;
  variant?: "default" | "sidebar";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
        variant === "sidebar"
          ? "border border-white/10 bg-white/10 text-white"
          : "border border-primary/20 bg-primary/10 text-primary",
      )}
    >
      <Building2 className="h-3.5 w-3.5" />
      {role.replace("_", " ")}
    </div>
  );
}
