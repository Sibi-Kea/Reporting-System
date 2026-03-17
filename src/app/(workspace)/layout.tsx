import { Bell, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { CompanyRoleBadge, WorkspaceNav } from "@/components/workspace-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscriptionPlanLabels } from "@/lib/tenant";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const [company, unreadNotifications] = await Promise.all([
    prisma.company.findUnique({
      where: { id: session.user.companyId },
    }),
    prisma.notification.count({
      where: {
        companyId: session.user.companyId,
        userId: session.user.id,
        readAt: null,
      },
    }),
  ]);

  const companyPlan = company?.subscriptionPlan ?? session.user.subscriptionPlan;
  const companyStatus = company?.status ?? session.user.companyStatus;

  return (
    <div className="min-h-screen bg-[#eef3f8] dark:bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden h-screen w-[252px] shrink-0 bg-[linear-gradient(180deg,#1b315f_0%,#14264c_100%)] px-4 py-5 text-white lg:sticky lg:top-0 lg:flex lg:flex-col">
          <Logo className="px-1" inverted logoUrl={company?.logoUrl} title={company?.name ?? "WorkTrack Pro"} />
          <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">Workspace</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-lg font-semibold leading-tight">{company?.name ?? "Your Company"}</p>
                <p className="mt-1 text-xs text-white/60">{company?.slug ?? session.user.companySlug}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CompanyRoleBadge role={session.user.role} variant="sidebar" />
                <Badge className="border-white/10 bg-white/10 text-white" variant="outline">
                  {subscriptionPlanLabels[companyPlan]}
                </Badge>
                <Badge
                  className={companyStatus === "ACTIVE" ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"}
                  variant={companyStatus === "ACTIVE" ? "success" : "destructive"}
                >
                  {companyStatus.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <p className="px-3 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">Navigation</p>
            <WorkspaceNav plan={session.user.subscriptionPlan} role={session.user.role} variant="sidebar" />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 lg:hidden">
                <Logo logoUrl={company?.logoUrl} title={company?.name ?? "WorkTrack Pro"} />
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Button className="h-11 w-11 rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950" size="icon" variant="outline">
                      <Bell className="h-4 w-4" />
                    </Button>
                    {unreadNotifications > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </div>
                  <UserMenu
                    avatarUrl={session.user.image}
                    email={session.user.email ?? ""}
                    name={session.user.name ?? "User"}
                    role={session.user.role}
                  />
                </div>
              </div>
              <div className="lg:hidden">
                <WorkspaceNav compact plan={session.user.subscriptionPlan} role={session.user.role} />
              </div>
              <div className="hidden items-center justify-between gap-6 lg:flex">
                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    aria-label="Workspace search"
                    className="h-12 rounded-2xl border-slate-200 bg-white pl-11 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                    placeholder="Search employees, reports, locations"
                    type="search"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Button className="h-11 w-11 rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950" size="icon" variant="outline">
                      <Bell className="h-4 w-4" />
                    </Button>
                    {unreadNotifications > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </div>
                  <UserMenu
                    avatarUrl={session.user.image}
                    email={session.user.email ?? ""}
                    name={session.user.name ?? "User"}
                    role={session.user.role}
                  />
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
