"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex flex-1 items-center justify-center text-muted" role="status">Loading…</div>;
  }

  const link = (active: boolean) =>
    cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
      active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-5 md:flex">
        <div className="mb-8 text-xl font-semibold tracking-wide">NAVI<span className="text-accent">語</span></div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? "page" : undefined}
              className={link(pathname.startsWith(n.href))}>
              <span aria-hidden className="w-5 text-center text-accent">{n.glyph}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-4 text-sm">
          <div className="truncate text-muted">{user.displayName}</div>
          <ThemeToggle className="-mx-3 mt-1" />
          <button onClick={() => { signOut(); router.replace("/login"); }} className="mt-1 text-muted underline-offset-4 hover:text-foreground hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-10 md:pt-10">
        <div className="mb-4 flex justify-end md:hidden">
          <ThemeToggle />
        </div>
        {children}
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV_ITEMS.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
              className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px]", active ? "text-foreground" : "text-muted")}>
              <span aria-hidden className={cn("text-base", active && "text-accent")}>{n.glyph}</span>{n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
