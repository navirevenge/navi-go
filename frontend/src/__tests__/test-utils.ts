import { vi } from "vitest";
import type { User } from "@/lib/types";

export const USER = { id: "u1", email: "taro@example.com", displayName: "Taro" } as User;

export function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    statusText: status < 400 ? "OK" : "Error",
    json: async () => body,
  };
}

export function stubFetch(impl: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => impl(url, init));
  vi.stubGlobal("fetch", fn);
  return fn;
}
