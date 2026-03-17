"use client";

import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function UserMenu({
  name,
  email,
  avatarUrl,
  role,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-12 rounded-2xl border border-slate-200 bg-white px-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950" variant="outline">
            <Avatar className="h-8 w-8">
              <AvatarImage alt={name} src={avatarUrl ?? undefined} />
              <AvatarFallback name={name} />
            </Avatar>
            <div className="hidden min-w-0 px-2 text-left md:block">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{role.replace("_", " ")}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-1">
            <p className="font-semibold">{name}</p>
            <p className="text-xs font-normal text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2">
            <Shield className="h-4 w-4" />
            {role.replace("_", " ")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onClick={() =>
              signOut({
                callbackUrl: "/login",
              })
            }
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
