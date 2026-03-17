import { AlertTriangle } from "lucide-react";
import { ReceptionDashboard } from "@/components/reception-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicLoginCompany } from "@/services/settings-service";
import { getReceptionDashboardState } from "@/services/reception-service";

export default async function ReceptionPage({
  searchParams,
}: {
  searchParams?: {
    company?: string;
    code?: string;
  };
}) {
  const company = await getPublicLoginCompany(searchParams?.company);

  if (!company) {
    return (
      <main className="min-h-screen bg-[#eef3f8] px-6 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No reception workspace</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">No active company is configured for the public reception dashboard.</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  try {
    const state = await getReceptionDashboardState({
      companySlug: company.slug,
      codeId: searchParams?.code,
    });

    return <ReceptionDashboard initialState={state} />;
  } catch (error) {
    return (
      <main className="min-h-screen bg-[#eef3f8] px-6 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Reception dashboard unavailable</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Reception mode is not configured for this workspace yet."}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
}
