import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { tokenStore } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";
import { jsonResponse, stubFetch, USER } from "./test-utils";

function Probe() {
  const { user, loading, signIn, signOut } = useAuth();
  return (
    <div>
      <span>{loading ? "loading" : user ? `user:${user.displayName}` : "anonymous"}</span>
      <button onClick={() => signIn({ accessToken: "fresh", user: USER } as AuthResponse)}>sign in</button>
      <button onClick={signOut}>sign out</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("is anonymous and makes no request when no token is stored", async () => {
  const fetchMock = stubFetch(() => jsonResponse(USER));
  renderProbe();
  expect(await screen.findByText("anonymous")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("restores the session from a stored token", async () => {
  tokenStore.set("stored");
  stubFetch(() => jsonResponse(USER));
  renderProbe();
  expect(await screen.findByText("user:Taro")).toBeInTheDocument();
});

test("clears a stored token that the server rejects", async () => {
  tokenStore.set("expired");
  stubFetch(() => jsonResponse({ message: "expired" }, 401));
  renderProbe();
  expect(await screen.findByText("anonymous")).toBeInTheDocument();
  expect(tokenStore.get()).toBeNull();
});

test("signIn stores the token and signOut clears it", async () => {
  renderProbe();
  await screen.findByText("anonymous");

  fireEvent.click(screen.getByRole("button", { name: "sign in" }));
  expect(screen.getByText("user:Taro")).toBeInTheDocument();
  expect(tokenStore.get()).toBe("fresh");

  fireEvent.click(screen.getByRole("button", { name: "sign out" }));
  expect(screen.getByText("anonymous")).toBeInTheDocument();
  expect(tokenStore.get()).toBeNull();
});

test("useAuth throws outside AuthProvider", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Probe />)).toThrow("useAuth must be used within AuthProvider");
});
