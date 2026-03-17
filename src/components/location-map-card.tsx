"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LocationMap = dynamic(() => import("./location-map-visual").then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse bg-secondary/40" />,
});

export function LocationMapCard({
  officeLocations,
  currentCoordinates,
}: {
  officeLocations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }>;
  currentCoordinates: { latitude: number; longitude: number } | null;
}) {
  const [visible, setVisible] = useState(false);
  const center = useMemo(() => {
    if (currentCoordinates) {
      return [currentCoordinates.latitude, currentCoordinates.longitude] as [number, number];
    }

    return officeLocations.length
      ? ([officeLocations[0].latitude, officeLocations[0].longitude] as [number, number])
      : ([-26.2041, 28.0473] as [number, number]);
  }, [currentCoordinates, officeLocations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location verification</CardTitle>
        <CardDescription>Preview office boundaries and compare them with the latest captured employee coordinates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {currentCoordinates
              ? `Latest GPS fix: ${currentCoordinates.latitude.toFixed(4)}, ${currentCoordinates.longitude.toFixed(4)}`
              : `${officeLocations.length} configured office location(s). Capture GPS to compare against the active radius.`}
          </div>
          <Button onClick={() => setVisible((current) => !current)} type="button" variant="outline">
            {visible ? "Hide map" : "Open map"}
          </Button>
        </div>
        {visible ? (
          <div className="overflow-hidden rounded-[28px] border border-border">
            <LocationMap center={center} currentCoordinates={currentCoordinates} officeLocations={officeLocations} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
