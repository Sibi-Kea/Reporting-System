"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Smartphone } from "lucide-react";

export function StaffAccessQrCard({
  companySlug,
  companyName,
}: {
  companySlug: string;
  companyName?: string;
}) {
  const [origin, setOrigin] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const normalizedCompanySlug = companySlug.trim().toLowerCase();
  const staffLoginPath = "/login?view=staff";
  const staffLoginUrl = useMemo(() => (origin && staffLoginPath ? `${origin}${staffLoginPath}` : ""), [origin, staffLoginPath]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!staffLoginUrl) {
      setImage(null);
      return () => {
        isCancelled = true;
      };
    }

    void QRCode.toDataURL(staffLoginUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then((nextImage: string) => {
      if (!isCancelled) {
        setImage(nextImage);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [staffLoginUrl]);

  return (
    <div className="rounded-[30px] border border-white/10 bg-white/10 p-5 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.7)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Live staff QR</p>
          <p className="text-xs text-white/65">{companyName ?? normalizedCompanySlug}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[26px] border border-white/10 bg-white/95 p-4">
        {image ? (
          <img alt="Staff access QR code" className="mx-auto h-60 w-60 rounded-2xl" src={image} />
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 text-center">
            <Smartphone className="h-8 w-8 text-slate-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Public workspace unavailable</p>
              <p className="text-xs text-muted-foreground">Set a public login workspace in Settings to publish the live staff QR.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
