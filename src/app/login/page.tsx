import { redirect } from "next/navigation";
import { LoginShell } from "@/components/login-shell";
import { getServerAuthSession } from "@/lib/auth";
import { getPublicLoginCompany } from "@/services/settings-service";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: {
    reason?: string;
    company?: string;
    view?: string;
  };
}) {
  const session = await getServerAuthSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  const notice =
    searchParams?.reason === "suspended"
      ? "This company workspace is suspended. Contact your super admin or billing owner."
      : searchParams?.reason === "inactive"
        ? "This account is inactive. Contact your administrator."
        : null;
  const defaultView = searchParams?.view === "staff" ? "staff" : "admin";
  const publicLoginCompany = await getPublicLoginCompany(searchParams?.company);
  const defaultCompanySlug = publicLoginCompany?.slug ?? "sm-techie";

  return (
    <LoginShell
      defaultCompanyName={publicLoginCompany?.name ?? defaultCompanySlug}
      defaultCompanySlug={defaultCompanySlug}
      defaultView={defaultView}
      notice={notice}
      quickClockEnabled={publicLoginCompany?.settings?.quickClockEnabled ?? false}
    />
  );
}
