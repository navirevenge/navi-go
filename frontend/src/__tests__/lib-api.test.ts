import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, ApiError, tokenStore } from "@/lib/api";
import { jsonResponse, stubFetch } from "./test-utils";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

test("tokenStore persists, reads and clears the access token", () => {
  expect(tokenStore.get()).toBeNull();
  tokenStore.set("abc");
  expect(tokenStore.get()).toBe("abc");
  tokenStore.clear();
  expect(tokenStore.get()).toBeNull();
});

test("sends JSON and a bearer token when one is stored", async () => {
  tokenStore.set("tok");
  const fetchMock = stubFetch(() => jsonResponse({ id: "u1" }));
  await expect(api.me()).resolves.toEqual({ id: "u1" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("http://localhost:8080/api/v1/auth/me");
  expect(init?.headers).toMatchObject({ "Content-Type": "application/json", Authorization: "Bearer tok" });
});

test("omits the Authorization header when signed out", async () => {
  const fetchMock = stubFetch(() => jsonResponse([]));
  await api.lessons();
  expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
});

test("turns network failures into an ApiError with status 0", async () => {
  stubFetch(() => {
    throw new TypeError("Failed to fetch");
  });
  const err = await api.me().catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 0, message: "Cannot reach the server. Is the backend running?" });
});

test("surfaces the server message and field errors", async () => {
  stubFetch(() => jsonResponse({ message: "Invalid input", fieldErrors: { email: "Must be an email" } }, 400));
  await expect(api.login({ email: "x", password: "y" })).rejects.toMatchObject({
    status: 400,
    message: "Invalid input",
    fieldErrors: { email: "Must be an email" },
  });
});

test("falls back to the status text when the error body is not JSON", async () => {
  stubFetch(() => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    json: () => Promise.reject(new SyntaxError("not json")),
  }));
  await expect(api.lessons()).rejects.toMatchObject({ status: 500, message: "Internal Server Error" });
});

test("falls back to the status text when the error body has no message", async () => {
  stubFetch(() => jsonResponse(null, 404));
  await expect(api.lessons()).rejects.toMatchObject({ status: 404, message: "Error" });
});

test("register and login send credentials as JSON POST bodies", async () => {
  const fetchMock = stubFetch(() => jsonResponse({ accessToken: "t", user: {} }));
  await api.register({ email: "a@b.c", password: "pw12345678", displayName: "Taro", currentLevel: "N5" });
  await api.login({ email: "a@b.c", password: "pw" });

  const [registerUrl, registerInit] = fetchMock.mock.calls[0];
  expect(registerUrl).toMatch(/\/api\/v1\/auth\/register$/);
  expect(registerInit?.method).toBe("POST");
  expect(JSON.parse(String(registerInit?.body))).toEqual({
    email: "a@b.c",
    password: "pw12345678",
    displayName: "Taro",
    currentLevel: "N5",
  });

  const [loginUrl, loginInit] = fetchMock.mock.calls[1];
  expect(loginUrl).toMatch(/\/api\/v1\/auth\/login$/);
  expect(JSON.parse(String(loginInit?.body))).toEqual({ email: "a@b.c", password: "pw" });
});

test("dashboard request includes the browser timezone", async () => {
  const fetchMock = stubFetch(() => jsonResponse({}));
  await api.dashboard();
  expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/dashboard?timezone=");
});

test("study session endpoints use the right paths and bodies", async () => {
  const fetchMock = stubFetch(() => jsonResponse({ id: "s1" }));
  await api.lessons();
  await api.startSession(null);
  await api.completeSession("s1", 15);

  const [lessonsUrl] = fetchMock.mock.calls[0];
  expect(lessonsUrl).toMatch(/\/api\/v1\/lessons$/);

  const [startUrl, startInit] = fetchMock.mock.calls[1];
  expect(startUrl).toMatch(/\/api\/v1\/study-sessions$/);
  expect(JSON.parse(String(startInit?.body))).toEqual({ lessonId: null });

  const [completeUrl, completeInit] = fetchMock.mock.calls[2];
  expect(completeUrl).toMatch(/\/api\/v1\/study-sessions\/s1\/complete$/);
  expect(JSON.parse(String(completeInit?.body))).toEqual({ durationMinutes: 15 });
});
