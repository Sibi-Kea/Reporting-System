"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Option = {
  id: string;
  name: string;
};

function generateStaffCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function EmployeeCreateDialog({
  departments,
  managers,
  shifts,
}: {
  departments: Option[];
  managers: Option[];
  shifts: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    employeeId: "",
    clockPin: generateStaffCode(),
    position: "",
    departmentId: departments[0]?.id ?? "",
    managerId: managers[0]?.id ?? "",
    shiftId: shifts[0]?.id ?? "",
    role: "EMPLOYEE",
    password: "Password123!",
  });

  async function submit() {
    setIsPending(true);

    const response = await fetch("/api/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      toast.error(result?.error ?? "Unable to create employee.");
      return;
    }

    toast.success("Employee created.");
    setForm({
      name: "",
      email: "",
      employeeId: "",
      clockPin: generateStaffCode(),
      position: "",
      departmentId: departments[0]?.id ?? "",
      managerId: managers[0]?.id ?? "",
      shiftId: shifts[0]?.id ?? "",
      role: "EMPLOYEE",
      password: "Password123!",
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create employee</DialogTitle>
          <DialogDescription>Add a new employee to the company directory and assign their reporting line.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} value={form.email} />
          </div>
          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Input onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} value={form.employeeId} />
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Input onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} value={form.position} />
          </div>
          <div className="space-y-2">
            <Label>Staff code</Label>
            <Input inputMode="numeric" maxLength={8} onChange={(event) => setForm((current) => ({ ...current, clockPin: event.target.value }))} placeholder="Required 4-8 digits" value={form.clockPin} />
            <p className="text-xs text-muted-foreground">Employees use this company-scoped code to sign in to the staff portal.</p>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select onValueChange={(value) => setForm((current) => ({ ...current, departmentId: value }))} value={form.departmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Manager</Label>
            <Select onValueChange={(value) => setForm((current) => ({ ...current, managerId: value }))} value={form.managerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Shift</Label>
            <Select onValueChange={(value) => setForm((current) => ({ ...current, shiftId: value }))} value={form.shiftId}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select onValueChange={(value) => setForm((current) => ({ ...current, role: value }))} value={form.role}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {["EMPLOYEE", "MANAGER", "ADMIN"].map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={isPending} onClick={() => void submit()} type="button">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
