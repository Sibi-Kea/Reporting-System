"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmployeeQuickClockDialog({
  employeeId,
  employeeName,
  hasPin,
}: {
  employeeId: string;
  employeeName: string;
  hasPin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [clockPin, setClockPin] = useState("");

  async function savePin() {
    setIsPending(true);
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clockPin,
      }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to update staff code.");
      return;
    }

    toast.success("Staff code updated.");
    setOpen(false);
    setClockPin("");
    router.refresh();
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <Shield className="mr-2 h-4 w-4" />
          {hasPin ? "Reset code" : "Set code"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Staff code</DialogTitle>
          <DialogDescription>Set the 4-8 digit staff code {employeeName} will use for staff portal sign-in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="clockPin">Staff code</Label>
          <Input
            id="clockPin"
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => setClockPin(event.target.value)}
            placeholder="Enter a 4-8 digit staff code"
            value={clockPin}
          />
        </div>
        <DialogFooter>
          <Button disabled={isPending} onClick={() => void savePin()} type="button">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save staff code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
