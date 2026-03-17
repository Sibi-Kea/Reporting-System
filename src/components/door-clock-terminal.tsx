"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DoorClockTerminal({
  companyName,
  companySlug,
  qrToken,
  mode,
  logoUrl,
}: {
  companyName: string;
  companySlug: string;
  qrToken: string;
  mode: string;
  logoUrl?: string | null;
}) {
  const [staffCode, setStaffCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    const response = await fetch("/api/public/reception/clock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companySlug,
        staffCode: staffCode.trim(),
        qrToken,
        device: navigator.userAgent,
      }),
    });

    const result = (await response.json().catch(() => null)) as {
      error?: string;
      action?: "CLOCK_IN" | "CLOCK_OUT";
      employee?: { name: string };
    } | null;
    setIsPending(false);

    if (!response.ok || !result?.action || !result.employee) {
      setError(result?.error ?? "Unable to complete this door clock action.");
      return;
    }

    setSuccess(`${result.employee.name} ${result.action === "CLOCK_OUT" ? "clocked out" : "clocked in"} successfully.`);
    setStaffCode("");
  }

  const modeLabel = mode === "clock_out" ? "Clock-out mode" : mode === "clock_in" ? "Clock-in mode" : "Flexible mode";

  return (
    <main className="min-h-screen bg-[#eef3f8] px-6 py-8 dark:bg-slate-950 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[36px] bg-[linear-gradient(180deg,#1b315f_0%,#14264c_100%)] p-8 text-white shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`${companyName} logo`} className="h-14 w-14 rounded-2xl object-cover" src={logoUrl} />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-semibold">WT</div>
            )}
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/60">Door clock</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{companyName}</h1>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium">{modeLabel}</div>
            <h2 className="text-4xl font-semibold tracking-tight">Scan at the door, enter your staff code, and continue.</h2>
            <p className="max-w-md text-base leading-8 text-white/75">
              This reception flow uses the live QR from the entrance display and will automatically complete the correct attendance action for the current employee.
            </p>
          </div>
        </div>

        <Card className="rounded-[32px] border-slate-200/80 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Staff code required</CardTitle>
            <CardDescription>Use the same 4-8 digit staff code assigned in the employee directory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="staffCode">Staff code</Label>
                <Input
                  id="staffCode"
                  inputMode="numeric"
                  onChange={(event) => {
                    setStaffCode(event.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  placeholder="4-8 digit staff code"
                  type="password"
                  value={staffCode}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}
              <Button className="w-full" disabled={isPending || !qrToken} size="lg" type="submit">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Complete attendance
              </Button>
            </form>

            <div className="rounded-[24px] border border-border bg-secondary/20 px-4 py-4 text-sm text-muted-foreground">
              If the QR expired before you submitted, rescan the current reception QR at the door and try again.
            </div>

            <Button asChild className="w-full" size="lg" type="button" variant="outline">
              <Link href="/login?view=staff">Open staff portal instead</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
