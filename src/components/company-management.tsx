"use client";

import { CompanyStatus, SubscriptionPlan } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LogoUploadField } from "@/components/logo-upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const planLabels: Record<SubscriptionPlan, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PREMIUM: "Premium",
};

const statusLabels: Record<CompanyStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logoUrl: string | null;
  subscriptionPlan: SubscriptionPlan;
  status: CompanyStatus;
  _count: {
    users: number;
    departments: number;
    officeLocations: number;
  };
};

type CompanyDraft = {
  name: string;
  slug: string;
  timezone: string;
  logoUrl: string;
  subscriptionPlan: SubscriptionPlan;
  status: CompanyStatus;
};

export function CompanyManagement({
  companies,
  activeCompanyId,
}: {
  companies: CompanyRow[];
  activeCompanyId: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, CompanyDraft>>(
    Object.fromEntries(
      companies.map((company) => [
        company.id,
        {
          name: company.name,
          slug: company.slug,
          timezone: company.timezone,
          logoUrl: company.logoUrl ?? "",
          subscriptionPlan: company.subscriptionPlan,
          status: company.status,
        },
      ]),
    ),
  );
  const [newCompany, setNewCompany] = useState<CompanyDraft>({
    name: "",
    slug: "",
    timezone: "Africa/Johannesburg",
    logoUrl: "",
    subscriptionPlan: SubscriptionPlan.STARTER,
    status: CompanyStatus.ACTIVE,
  });

  function updateDraft<K extends keyof CompanyDraft>(companyId: string, key: K, value: CompanyDraft[K]) {
    setDrafts((current) => ({
      ...current,
      [companyId]: {
        ...current[companyId],
        [key]: value,
      },
    }));
  }

  async function saveCompany(companyId: string) {
    setIsPending(true);
    const response = await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(drafts[companyId]),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to update company.");
      return;
    }

    toast.success("Company updated.");
    router.refresh();
  }

  async function removeCompany(companyId: string) {
    if (companyId === activeCompanyId) {
      toast.error("Switch away from the current company before deleting it.");
      return;
    }

    setIsPending(true);
    const response = await fetch(`/api/companies/${companyId}`, {
      method: "DELETE",
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to delete company.");
      return;
    }

    toast.success("Company deleted.");
    router.refresh();
  }

  async function create() {
    setIsPending(true);
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCompany),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to create company.");
      return;
    }

    toast.success("Company created.");
    setNewCompany({
      name: "",
      slug: "",
      timezone: "Africa/Johannesburg",
      logoUrl: "",
      subscriptionPlan: SubscriptionPlan.STARTER,
      status: CompanyStatus.ACTIVE,
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Company management</CardTitle>
          <CardDescription>Create, edit, suspend, and retire tenant companies from the super-admin workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="space-y-3">
                      <Input value={drafts[company.id]?.name ?? company.name} onChange={(event) => updateDraft(company.id, "name", event.target.value)} />
                      <LogoUploadField companyId={company.id} label="Tenant logo" onChange={(value) => updateDraft(company.id, "logoUrl", value)} value={drafts[company.id]?.logoUrl ?? ""} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input value={drafts[company.id]?.slug ?? company.slug} onChange={(event) => updateDraft(company.id, "slug", event.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(value) => updateDraft(company.id, "subscriptionPlan", value as SubscriptionPlan)}
                      value={drafts[company.id]?.subscriptionPlan ?? company.subscriptionPlan}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(planLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select onValueChange={(value) => updateDraft(company.id, "status", value as CompanyStatus)} value={drafts[company.id]?.status ?? company.status}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={drafts[company.id]?.timezone ?? company.timezone}
                      onChange={(event) => updateDraft(company.id, "timezone", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {company._count.users} users / {company._count.departments} departments / {company._count.officeLocations} locations
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button disabled={isPending} onClick={() => void saveCompany(company.id)} type="button" variant="outline">
                        Save
                      </Button>
                      <Button disabled={isPending} onClick={() => void removeCompany(company.id)} size="icon" type="button" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Add company</CardTitle>
          <CardDescription>Create a new SaaS tenant with its own plan, security settings, users, and reporting scope.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={newCompany.name} onChange={(event) => setNewCompany((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={newCompany.slug} onChange={(event) => setNewCompany((current) => ({ ...current, slug: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={newCompany.timezone} onChange={(event) => setNewCompany((current) => ({ ...current, timezone: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Subscription plan</Label>
            <Select
              onValueChange={(value) => setNewCompany((current) => ({ ...current, subscriptionPlan: value as SubscriptionPlan }))}
              value={newCompany.subscriptionPlan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(planLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select onValueChange={(value) => setNewCompany((current) => ({ ...current, status: value as CompanyStatus }))} value={newCompany.status}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LogoUploadField label="Company logo" onChange={(value) => setNewCompany((current) => ({ ...current, logoUrl: value }))} value={newCompany.logoUrl} />
          <Button disabled={isPending} onClick={() => void create()} type="button">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create company
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
