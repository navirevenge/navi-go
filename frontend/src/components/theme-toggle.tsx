"use client";

import * as React from "react";
import { getTheme, setTheme, subscribeTheme, syncThemeColor, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const serverTheme = (): Theme => "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = React.useSyncExternalStore(subscribeTheme, getTheme, serverTheme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  React.useEffect(() => {
    syncThemeColor();
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground", className)}
    >
      <span aria-hidden className="w-5 text-center text-accent">{theme === "dark" ? "☀" : "☾"}</span>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
