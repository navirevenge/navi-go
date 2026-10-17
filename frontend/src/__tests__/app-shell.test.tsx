import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import { tokenStore } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { jsonResponse, stubFetch, USER } from "./test-utils";

const nav = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, router: { replace }, pathname: { current: "/study" } };
});
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname.current,
  useRouter: () => nav.router,
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...p}>{children}</a> }));

function renderShell() {
  return render(
    <AuthProvider>
      <AppShell>
        <p>page body</p>
      </AppShell>
    </AuthProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  nav.replace.mockClear();
  nav.pathname.current = "/study";
});
afterEach(() => vi.unstubAllGlobals());

test("shows a loading state until the session is restored", async () => {
  tokenStore.set("tok");
  stubFetch(() => jsonResponse(USER));
  renderShell();
  expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  expect(await screen.findByText("page body")).toBeInTheDocument();
});

test("marks the current section in both navigations", async () => {
  tokenStore.set("tok");
  stubFetch(() => jsonResponse(USER));
  renderShell();
  await screen.findByText("page body");

  const studyLinks = screen.getAllByRole("link", { name: "Study" });
  expect(studyLinks).toHaveLength(2);
  studyLinks.forEach((link) => expect(link).toHaveAttribute("aria-current", "page"));

  screen.getAllByRole("link", { name: "Dashboard" }).forEach((link) => expect(link).not.toHaveAttribute("aria-current"));
});

test("sign out clears the session and returns to login", async () => {
  tokenStore.set("tok");
  stubFetch(() => jsonResponse(USER));
  renderShell();
  fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(tokenStore.get()).toBeNull();
  expect(nav.replace).toHaveBeenCalledWith("/login");
});

test("redirects to login when there is no session", async () => {
  renderShell();
  expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  await vi.waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login"));
});
