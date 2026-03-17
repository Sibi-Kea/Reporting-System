"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Option = {
  id: string;
  name: string;
};

type QrCodeRow = {
  id: string;
  label: string;
  rotationMinutes: number;
  officeLocation: { name: string };
  department: { name: string } | null;
  expiresAt: string | Date;
};

export function QrCodeManagement({
  locations,
  departments,
  codes,
  companySlug,
}: {
  locations: Option[];
  departments: Option[];
  codes: QrCodeRow[];
  companySlug: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [preview, setPreview] = useState<{ id: string; image: string; expiresAt: string } | null>(null);
  const [form, setForm] = useState({
    label: "",
    officeLocationId: locations[0]?.id ?? "",
    departmentId: "all",
    rotationMinutes: 5,
    isActive: true,
  });

  const codeOptions = useMemo(() => codes.map((code) => ({ id: code.id, label: code.label })), [codes]);
  const canCreate = Boolean(form.officeLocationId);

  async function createCode() {
    if (!canCreate) {
      toast.error("Create at least one office location before adding QR entry points.");
      return;
    }

    setIsPending(true);
    const response = await fetch("/api/qr-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        departmentId: form.departmentId === "all" ? null : form.departmentId,
      }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to create QR code.");
      return;
    }

    toast.success("QR clock code created.");
    router.refresh();
  }

  async function loadPreview(id: string) {
    setIsPending(true);
    const response = await fetch(`/api/qr-codes/${id}`);
    const result = (await response.json().catch(() => null)) as { error?: string; token?: string; expiresAt?: string } | null;
    setIsPending(false);

    if (!response.ok || !result?.token || !result.expiresAt) {
      toast.error(result?.error ?? "Unable to issue QR preview.");
      return;
    }

    const image = await QRCode.toDataURL(result.token, {
      margin: 1,
      width: 320,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    setPreview({
      id,
      image,
      expiresAt: result.expiresAt,
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>QR access points</CardTitle>
          <CardDescription>Generate rotating QR clock-in codes per office or department.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 md:hidden">
            {codes.map((code) => (
              <div className="rounded-[28px] border border-border bg-secondary/20 p-4" key={code.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{code.label}</p>
                      <p className="text-sm text-muted-foreground">{code.officeLocation.name}</p>
                    </div>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                      {code.rotationMinutes} min
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                    Department: {code.department?.name ?? "All departments"}
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button className="w-full" disabled={isPending} onClick={() => void loadPreview(code.id)} type="button" variant="outline">
                      <QrCode className="mr-2 h-4 w-4" />
                      Show live QR
                    </Button>
                    <Button asChild className="w-full" type="button" variant="secondary">
                      <a href={`/reception?company=${encodeURIComponent(companySlug)}&code=${encodeURIComponent(code.id)}`} rel="noreferrer" target="_blank">
                        Open reception view
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Rotation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>{code.label}</TableCell>
                    <TableCell>{code.officeLocation.name}</TableCell>
                    <TableCell>{code.department?.name ?? "All"}</TableCell>
                    <TableCell>{code.rotationMinutes} min</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button disabled={isPending} onClick={() => void loadPreview(code.id)} type="button" variant="outline">
                          <QrCode className="mr-2 h-4 w-4" />
                          Show QR
                        </Button>
                        <Button asChild type="button" variant="secondary">
                          <a href={`/reception?company=${encodeURIComponent(companySlug)}&code=${encodeURIComponent(code.id)}`} rel="noreferrer" target="_blank">
                            Reception
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!codes.length ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No QR access points have been created yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create QR entry point</CardTitle>
            <CardDescription>Define where employees may scan a rotating QR code for clocking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select onValueChange={(value) => setForm((current) => ({ ...current, officeLocationId: value }))} value={form.officeLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select onValueChange={(value) => setForm((current) => ({ ...current, departmentId: value }))} value={form.departmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rotation minutes</Label>
              <Input
                type="number"
                value={form.rotationMinutes}
                onChange={(event) => setForm((current) => ({ ...current, rotationMinutes: Number(event.target.value) }))}
              />
            </div>
            <Button className="w-full sm:w-auto" disabled={isPending || !canCreate} onClick={() => void createCode()} type="button">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Create QR code
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live QR preview</CardTitle>
            <CardDescription>The preview reflects the current signed token for the selected QR access point. Use the Reception button to open the public doorway dashboard for that code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview ? (
              <>
                <div className="flex justify-center rounded-[28px] border border-border bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="QR code preview" className="h-auto w-full max-w-[256px]" src={preview.image} />
                </div>
                <p className="text-sm text-muted-foreground">Expires at {new Date(preview.expiresAt).toLocaleTimeString()}</p>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Choose an existing QR code and click &quot;Show QR&quot; to issue the latest rotating token.
              </div>
            )}
            {codeOptions.length ? <div className="text-xs text-muted-foreground">{codeOptions.length} configured QR access point(s).</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
