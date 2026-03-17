"use client";

import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallCard() {
  const { canInstall, install } = usePwaInstall();

  return (
    <Card>
      <CardHeader>
        <CardTitle>PWA install</CardTitle>
        <CardDescription>Install WorkTrack Pro on shared devices or employee phones for faster launch and offline support.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Smartphone className="h-5 w-5 text-primary" />
          Add to home screen for app-like access.
        </div>
        <Button disabled={!canInstall} onClick={() => void install()} type="button" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Install
        </Button>
      </CardContent>
    </Card>
  );
}
