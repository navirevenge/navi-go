"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui/button";

const inputCls = "mt-1 w-full min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-accent";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = register
        ? await api.register({ email, password, displayName: String(f.get("displayName")), currentLevel: String(f.get("currentLevel")) })
        : await api.login({ email, password });
      signIn(res);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError("Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (n: string) => fieldErrors[n] && <p role="alert" className="mt-1 text-sm text-accent">{fieldErrors[n]}</p>;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="fade-up w-full max-w-sm space-y-5" noValidate>
        <div>
          <div className="text-3xl font-semibold tracking-wide">NAVI<span className="text-accent">語</span></div>
          <h1 className="mt-2 text-muted">{register ? "Create your account" : "Welcome back"}</h1>
        </div>
        {register && (
          <label className="block text-sm">Display name
            <input name="displayName" required maxLength={100} autoComplete="name" className={inputCls} />
            {fieldError("displayName")}
          </label>
        )}
        <label className="block text-sm">Email
          <input name="email" type="email" required autoComplete="email" className={inputCls} />
          {fieldError("email")}
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" required minLength={register ? 8 : undefined} maxLength={72}
            autoComplete={register ? "new-password" : "current-password"} className={inputCls} />
          {fieldError("password")}
        </label>
        {register && (
          <label className="block text-sm">Current level
            <select name="currentLevel" defaultValue="N5" className={inputCls}>
              {["N5", "N4", "N3", "N2", "N1"].map((l) => <option key={l} value={l}>{l}{l === "N5" ? " (beginner)" : ""}</option>)}
            </select>
          </label>
        )}
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</Button>
        <p className="text-center text-sm text-muted">
          {register ? <>Already have an account? <Link href="/login" className="text-foreground underline">Sign in</Link></>
            : <>New here? <Link href="/register" className="text-foreground underline">Create an account</Link></>}
        </p>
      </form>
    </div>
  );
}
