/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LogoUploadField({
  label = "Company logo",
  value,
  onChange,
  companyId,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  companyId?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    if (companyId) {
      formData.append("companyId", companyId);
    }

    setIsUploading(true);
    const response = await fetch("/api/uploads/logo", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
    setIsUploading(false);

    if (!response.ok || !result?.url) {
      toast.error(result?.error ?? "Unable to upload logo.");
      return;
    }

    onChange(result.url);
    toast.success("Logo uploaded.");
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {value ? (
          <img alt="Company logo preview" className="h-16 w-16 rounded-2xl object-cover" src={value} />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 space-y-3">
          <Input
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadFile(file);
              }
              event.target.value = "";
            }}
            type="file"
          />
          <Button disabled={isUploading || !value} onClick={() => onChange("")} type="button" variant="outline">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Remove logo
          </Button>
        </div>
      </div>
    </div>
  );
}
