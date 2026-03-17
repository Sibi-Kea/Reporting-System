import type { Route } from "next";
import Link from "next/link";
import { Role } from "@prisma/client";
import { EmployeeCreateDialog } from "@/components/employee-create-dialog";
import { EmployeeQuickClockDialog } from "@/components/employee-quick-clock-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireMinimumRole } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { listEmployees } from "@/services/employee-service";

function buildPageHref(page: number, search?: string, departmentId?: string) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (search) {
    params.set("search", search);
  }
  if (departmentId) {
    params.set("departmentId", departmentId);
  }
  return `/employees?${params.toString()}` as Route;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: {
    search?: string;
    page?: string;
    departmentId?: string;
  };
}) {
  const session = await requireMinimumRole(Role.MANAGER);
  const page = Number(searchParams?.page ?? "1");

  const [employees, departments, managers, shifts] = await Promise.all([
    listEmployees({
      actorId: session.user.id,
      companyId: session.user.companyId,
      role: session.user.role,
      search: searchParams?.search,
      departmentId: searchParams?.departmentId,
      page,
      pageSize: 10,
    }),
    prisma.department.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
        role: {
          in: [Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN],
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.shift.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
    }),
  ]);

  const canCreate = hasMinimumRole(session.user.role, Role.ADMIN);

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          canCreate ? (
            <EmployeeCreateDialog
              departments={departments.map((department) => ({ id: department.id, name: department.name }))}
              managers={managers.map((manager) => ({ id: manager.id, name: manager.name }))}
              shifts={shifts.map((shift) => ({ id: shift.id, name: shift.name }))}
            />
          ) : undefined
        }
        description="Search, filter, and manage employees with department assignments, staff codes, and reporting hierarchy."
        title="Employees"
      />

      <form className="grid gap-4 rounded-[28px] border border-border bg-card p-4 sm:grid-cols-[1fr_220px_auto]">
        <Input defaultValue={searchParams?.search} name="search" placeholder="Search by name, email, or employee ID" />
        <select
          className="h-11 rounded-2xl border border-input bg-background px-4 text-base sm:text-sm"
          defaultValue={searchParams?.departmentId ?? ""}
          name="departmentId"
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>

      <div className="surface-card overflow-hidden p-4 md:p-0">
        <div className="space-y-4 md:hidden">
          {employees.items.map((employee) => (
            <div className="rounded-[24px] border border-border bg-secondary/20 p-4" key={employee.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">{employee.employeeId} - {employee.email}</p>
                </div>
                <Badge variant={employee.isActive ? "success" : "destructive"}>{employee.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Department</p>
                  <p className="mt-1 text-sm font-medium">{employee.department?.name ?? "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Manager</p>
                  <p className="mt-1 text-sm font-medium">{employee.manager?.name ?? "None"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Role</p>
                  <p className="mt-1 text-sm font-medium">{employee.role.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Shift</p>
                  <p className="mt-1 text-sm font-medium">{employee.shift?.name ?? "No shift"}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant={employee.clockPinHash ? "success" : "secondary"}>{employee.clockPinHash ? "Code ready" : "Missing code"}</Badge>
              </div>
              {canCreate ? (
                <div className="mt-4">
                  <EmployeeQuickClockDialog employeeId={employee.id} employeeName={employee.name} hasPin={Boolean(employee.clockPinHash)} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Staff code</TableHead>
                <TableHead>Status</TableHead>
                {canCreate ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.items.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.employeeId} - {employee.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{employee.department?.name ?? "Unassigned"}</TableCell>
                  <TableCell>{employee.manager?.name ?? "None"}</TableCell>
                  <TableCell>{employee.role.replace("_", " ")}</TableCell>
                  <TableCell>{employee.shift?.name ?? "No shift"}</TableCell>
                  <TableCell>
                    <Badge variant={employee.clockPinHash ? "success" : "secondary"}>{employee.clockPinHash ? "Code ready" : "Missing code"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.isActive ? "success" : "destructive"}>{employee.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  {canCreate ? (
                    <TableCell>
                      <div className="flex justify-end">
                        <EmployeeQuickClockDialog employeeId={employee.id} employeeName={employee.name} hasPin={Boolean(employee.clockPinHash)} />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Page {employees.page} of {employees.totalPages} - {employees.total} employees</p>
        <div className="flex w-full gap-3 sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none" disabled={employees.page <= 1} variant="outline">
            <Link href={buildPageHref(Math.max(1, employees.page - 1), searchParams?.search, searchParams?.departmentId)}>
              Previous
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none" disabled={employees.page >= employees.totalPages} variant="outline">
            <Link
              href={buildPageHref(
                Math.min(employees.totalPages, employees.page + 1),
                searchParams?.search,
                searchParams?.departmentId,
              )}
            >
              Next
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
