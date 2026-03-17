"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  qrRotationMins: number;
};

export function LocationManagement({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, LocationRow>>(Object.fromEntries(locations.map((location) => [location.id, location])));
  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    latitude: -26.2041,
    longitude: 28.0473,
    radiusMeters: 100,
    qrRotationMins: 5,
    isActive: true,
  });

  async function saveLocation(id: string) {
    setIsPending(true);
    const response = await fetch(`/api/locations/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(drafts[id]),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to update location.");
      return;
    }

    toast.success("Location updated.");
    router.refresh();
  }

  async function createLocation() {
    setIsPending(true);
    const response = await fetch("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newLocation),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to create location.");
      return;
    }

    toast.success("Location created.");
    setNewLocation({
      name: "",
      address: "",
      latitude: -26.2041,
      longitude: 28.0473,
      radiusMeters: 100,
      qrRotationMins: 5,
      isActive: true,
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Office locations</CardTitle>
          <CardDescription>Manage geofenced office coordinates and allowed clocking radius for each site.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <div className="space-y-2">
                      <Input
                        value={drafts[location.id]?.name ?? location.name}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [location.id]: {
                              ...current[location.id],
                              name: event.target.value,
                            },
                          }))
                        }
                      />
                      <Input
                        placeholder="Address"
                        value={drafts[location.id]?.address ?? location.address ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [location.id]: {
                              ...current[location.id],
                              address: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell className="space-y-2">
                    <Input
                      value={drafts[location.id]?.latitude ?? location.latitude}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [location.id]: {
                            ...current[location.id],
                            latitude: Number(event.target.value),
                          },
                        }))
                      }
                    />
                    <Input
                      value={drafts[location.id]?.longitude ?? location.longitude}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [location.id]: {
                            ...current[location.id],
                            longitude: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Input
                        value={drafts[location.id]?.radiusMeters ?? location.radiusMeters}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [location.id]: {
                              ...current[location.id],
                              radiusMeters: Number(event.target.value),
                            },
                          }))
                        }
                      />
                      <Input
                        value={drafts[location.id]?.qrRotationMins ?? location.qrRotationMins}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [location.id]: {
                              ...current[location.id],
                              qrRotationMins: Number(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={drafts[location.id]?.isActive ?? location.isActive}
                        onCheckedChange={(checked) =>
                          setDrafts((current) => ({
                            ...current,
                            [location.id]: {
                              ...current[location.id],
                              isActive: checked,
                            },
                          }))
                        }
                      />
                      <span>{drafts[location.id]?.isActive ? "Active" : "Disabled"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button disabled={isPending} onClick={() => void saveLocation(location.id)} type="button" variant="outline">
                        Save
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
          <CardTitle>Add location</CardTitle>
          <CardDescription>Create an allowed office site for GPS and QR verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={newLocation.name} onChange={(event) => setNewLocation((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={newLocation.address} onChange={(event) => setNewLocation((current) => ({ ...current, address: event.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                type="number"
                value={newLocation.latitude}
                onChange={(event) => setNewLocation((current) => ({ ...current, latitude: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                type="number"
                value={newLocation.longitude}
                onChange={(event) => setNewLocation((current) => ({ ...current, longitude: Number(event.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Radius (meters)</Label>
            <Input
              type="number"
              value={newLocation.radiusMeters}
              onChange={(event) => setNewLocation((current) => ({ ...current, radiusMeters: Number(event.target.value) }))}
            />
          </div>
          <Button disabled={isPending} onClick={() => void createLocation()} type="button">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add location
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
