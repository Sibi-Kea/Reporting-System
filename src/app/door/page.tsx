import { DoorClockTerminal } from "@/components/door-clock-terminal";
import { getPublicLoginCompany } from "@/services/settings-service";

export default async function DoorPage({
  searchParams,
}: {
  searchParams?: {
    company?: string;
    token?: string;
    mode?: string;
  };
}) {
  const requestedCompany = searchParams?.company;
  const company = requestedCompany ? await getPublicLoginCompany(requestedCompany) : null;
  const resolvedCompany = company?.slug === requestedCompany ? company : null;

  return (
    <DoorClockTerminal
      companyName={resolvedCompany?.name ?? "WorkTrack Pro"}
      companySlug={resolvedCompany?.slug ?? requestedCompany ?? ""}
      logoUrl={resolvedCompany?.logoUrl}
      mode={searchParams?.mode ?? "flex"}
      qrToken={searchParams?.token ?? ""}
    />
  );
}
