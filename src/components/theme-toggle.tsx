"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";

export function ThemeToggle() {
  const hydrated = useHydrated();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      aria-label="Toggle theme"
      className="h-11 w-11 rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
      disabled={!hydrated}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      size="icon"
      type="button"
      variant="outline"
    >
      {hydrated ? (
        isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="block h-4 w-4 rounded-full bg-muted" />
      )}
    </Button>
  );
}
