import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AuthForm } from "@/components/auth-form";
import { tokenStore } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { jsonResponse, stubFetch, USER } from "./test-utils";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...p}>{children}</a> }));

function renderForm(mode: "login" | "register") {
  return render(
    <AuthProvider>
      <AuthForm mode={mode} />
    </AuthProvider>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  window.localStorage.clear();
  replace.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

test("signs in, stores the token and goes to the dashboard", async () => {
  const fetchMock = stubFetch(() => jsonResponse({ accessToken: "tok", user: USER }));
  renderForm("login");
  fill("Email", "taro@example.com");
  fill("Password", "secret");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  expect(tokenStore.get()).toBe("tok");
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ email: "taro@example.com", password: "secret" });
});

test("shows server errors and field errors without navigating", async () => {
  stubFetch(() => jsonResponse({ message: "Invalid credentials", fieldErrors: { password: "Too short" } }, 401));
  renderForm("login");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  expect(screen.getByText("Too short")).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});

test("falls back to a generic message for unexpected failures", async () => {
  stubFetch(() => ({ ok: true, status: 200, statusText: "OK", json: () => Promise.reject(new SyntaxError("bad")) }));
  renderForm("login");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
});

test("disables the submit button while the request is in flight", async () => {
  stubFetch(() => new Promise(() => {}));
  renderForm("login");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("button", { name: "Please wait…" })).toBeDisabled();
});

test("register mode collects name and level and creates the account", async () => {
  const fetchMock = stubFetch(() => jsonResponse({ accessToken: "new", user: USER }));
  renderForm("register");
  expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();

  fill("Display name", "Taro");
  fill("Email", "taro@example.com");
  fill("Password", "password123");
  fireEvent.change(screen.getByLabelText("Current level"), { target: { value: "N3" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    email: "taro@example.com",
    password: "password123",
    displayName: "Taro",
    currentLevel: "N3",
  });
});
