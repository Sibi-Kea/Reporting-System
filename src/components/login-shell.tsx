"use client";

import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { StaffAccessQrCard } from "@/components/staff-access-qr-card";

export function LoginShell({
  notice,
  defaultCompanySlug,
  defaultCompanyName,
  quickClockEnabled = false,
  defaultView,
}: {
  notice?: string | null;
  defaultCompanySlug: string;
  defaultCompanyName?: string;
  quickClockEnabled?: boolean;
  defaultView: "staff" | "admin";
}) {
  const companySlug = defaultCompanySlug;
  const companyName = defaultCompanyName ?? defaultCompanySlug;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eef3fa_0%,#f7f9fc_48%,#e8eef7_100%)] px-4 py-4 dark:bg-slate-950 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-[0_32px_110px_-56px_rgba(15,23,42,0.5)] backdrop-blur dark:border-white/5 dark:bg-slate-950/95 lg:grid-cols-[0.88fr_1.12fr]">
        <section className="hidden bg-[linear-gradient(180deg,#193566_0%,#14264c_100%)] p-8 text-white lg:flex lg:flex-col xl:p-10">
          <div className="space-y-8">
            <Logo
              inverted
              subtitle={`${companyName} workspace`}
              title="WorkTrack Pro"
            />

            <div className="max-w-lg space-y-4">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                Employee access
              </div>
              <div className="space-y-3">
                <h1 className="text-[clamp(2.4rem,4vw,3.9rem)] font-semibold leading-[0.96] tracking-tight">
                  Clocking access built for reception and mobile teams.
                </h1>
                <p className="max-w-md text-sm leading-7 text-white/70">
                  Staff use a single code. Managers and admins keep the full workspace login.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto max-w-[400px]">
            <StaffAccessQrCard companyName={companyName} companySlug={companySlug} />
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 sm:py-10 xl:px-14">
          <div className="w-full max-w-[620px] space-y-6">
            <div className="space-y-3 lg:hidden">
              <Logo subtitle={`${companyName} workspace`} title="WorkTrack Pro" />
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Staff use a single code. Managers and admins continue with full workspace credentials.
              </p>
            </div>

            <LoginForm
              companyName={companyName}
              companySlug={companySlug}
              defaultView={defaultView}
              notice={notice}
              quickClockEnabled={quickClockEnabled}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
