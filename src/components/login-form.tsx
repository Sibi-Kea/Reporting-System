"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanLine, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AccessView = "staff" | "admin";

export function LoginForm({
  notice,
  companySlug,
  companyName,
  quickClockEnabled = false,
  defaultView = "admin",
}: {
  notice?: string | null;
  companySlug: string;
  companyName?: string;
  quickClockEnabled?: boolean;
  defaultView?: AccessView;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccessView>(defaultView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const normalizedCompanySlug = companySlug.trim().toLowerCase();
  const quickClockHref = normalizedCompanySlug ? `/quick-clock?company=${encodeURIComponent(normalizedCompanySlug)}` : "/quick-clock";

  async function handleAdminSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await signIn("workspace-credentials", {
      companySlug: normalizedCompanySlug,
      email: email.trim(),
      password,
      redirect: false,
    });

    setIsPending(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleStaffSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await signIn("staff-portal", {
      companySlug: normalizedCompanySlug,
      staffCode: staffCode.trim(),
      redirect: false,
    });

    setIsPending(false);

    if (result?.error) {
      setError("Invalid staff code.");
      return;
    }

    router.push("/clock");
    router.refresh();
  }

  return (
    <Card className="rounded-[32px] border-slate-200/80 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="space-y-4 pb-3">
        <div className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Secure access
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl tracking-tight">Access your workspace</CardTitle>
          <CardDescription className="text-sm leading-6">
            {activeTab === "staff"
              ? "Staff enter with their assigned code only."
              : "Managers and admins continue with email and password."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {notice ? (
          <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{notice}</p>
        ) : null}

        <div className="rounded-[24px] border border-border bg-slate-50/80 px-4 py-4 dark:bg-slate-900/60">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{companyName ?? companySlug}</p>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">Public access</span>
          </div>
        </div>

        <Tabs
          onValueChange={(value) => {
            setActiveTab(value as AccessView);
            setError(null);
          }}
          value={activeTab}
        >
          <TabsList className="h-auto w-full rounded-[24px] bg-secondary/50 p-1">
            <TabsTrigger className="flex-1 rounded-[20px]" value="staff">
              Staff portal
            </TabsTrigger>
            <TabsTrigger className="flex-1 rounded-[20px]" value="admin">
              Admin access
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-5" value="staff">
            <form className="space-y-5 rounded-[28px] border border-border bg-slate-50/80 p-5 dark:bg-slate-900/60" onSubmit={handleStaffSubmit}>
              <div className="space-y-2">
                <Label htmlFor="staffCode">Staff code</Label>
                <Input
                  id="staffCode"
                  className="h-12 rounded-2xl"
                  inputMode="numeric"
                  onChange={(event) => {
                    setStaffCode(event.target.value);
                    setError(null);
                  }}
                  placeholder="4-8 digit code"
                  type="password"
                  value={staffCode}
                />
                <p className="text-xs text-muted-foreground">No email or employee ID required.</p>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1 rounded-2xl" disabled={isPending} size="lg" type="submit">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Enter staff portal
                </Button>
                {quickClockEnabled ? (
                  <Button asChild className="flex-1 rounded-2xl" size="lg" type="button" variant="outline">
                    <a href={quickClockHref}>
                      <ScanLine className="h-4 w-4" />
                      Quick clock only
                    </a>
                  </Button>
                ) : null}
              </div>
            </form>
          </TabsContent>

          <TabsContent className="mt-5" value="admin">
            <form className="space-y-4 rounded-[28px] border border-border bg-slate-50/80 p-5 dark:bg-slate-900/60" onSubmit={handleAdminSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  className="h-12 rounded-2xl"
                  id="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                  placeholder="name@company.com"
                  type="email"
                  value={email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  className="h-12 rounded-2xl"
                  id="password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full rounded-2xl" disabled={isPending} size="lg" type="submit">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
