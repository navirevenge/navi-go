import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import AppLayout from "@/app/(app)/layout";
import ConversationsPage from "@/app/(app)/conversations/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import ProgressPage from "@/app/(app)/progress/page";
import SettingsPage from "@/app/(app)/settings/page";
import StudyPage from "@/app/(app)/study/page";
import VocabularyPage from "@/app/(app)/vocabulary/page";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import RootLayout from "@/app/layout";
import manifest from "@/app/manifest";
import HomePage from "@/app/page";
import { AppShell } from "@/components/app-shell";
import type { Lesson } from "@/lib/types";
import { jsonResponse, stubFetch } from "./test-utils";

const nav = vi.hoisted(() => ({ redirect: vi.fn(), lesson: { current: null as string | null } }));
vi.mock("next/navigation", () => ({
  redirect: nav.redirect,
  useSearchParams: () => ({ get: () => nav.lesson.current }),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/components/dashboard-view", () => ({
  DashboardView: ({ data }: { data: { displayName: string } }) => <div>view:{data.displayName}</div>,
}));

const lessons = [
  { id: "l1", slug: "greetings", title: "Greetings", summary: "Say hello", lessonType: "VOCABULARY", jlptLevel: "N5", estimatedMinutes: 10 },
  { id: "l2", slug: "particles", title: "Particles", summary: "wa and ga", lessonType: "GRAMMAR", jlptLevel: "N5", estimatedMinutes: 15 },
] as Lesson[];

const startedAt = () => new Date(Date.now() - 5 * 60_000).toISOString();

function studyFetch(opts: { lessonsFail?: boolean; startFails?: boolean; completeFails?: boolean } = {}) {
  return stubFetch((url, init) => {
    if (url.endsWith("/api/v1/lessons")) {
      if (opts.lessonsFail) throw new TypeError("offline");
      return jsonResponse(lessons);
    }
    if (url.endsWith("/api/v1/study-sessions") && init?.method === "POST") {
      if (opts.startFails) throw new TypeError("offline");
      const { lessonId } = JSON.parse(String(init.body)) as { lessonId: string };
      return jsonResponse({ id: "s1", lessonId, startedAt: startedAt(), durationMinutes: 0 });
    }
    if (url.endsWith("/complete")) {
      if (opts.completeFails) throw new TypeError("offline");
      return jsonResponse({ id: "s1", lessonId: "l1", startedAt: startedAt(), durationMinutes: 5 });
    }
    throw new Error(`unexpected request: ${url}`);
  });
}

beforeEach(() => {
  nav.lesson.current = null;
  nav.redirect.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

test.each([
  [ProgressPage, "Progress", "Phase 4 — Intelligent learning"],
  [SettingsPage, "Settings", "Phase 2 — Learning foundation"],
  [VocabularyPage, "Vocabulary", "Phase 2 — Learning foundation"],
  [ConversationsPage, "Conversations", "Phase 3 — AI tutor"],
] as const)("%s placeholder page is shown", (Page, title, phase) => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  expect(screen.getByText(`Planned for ${phase}`)).toBeInTheDocument();
});

test("dashboard page shows loading, then the dashboard", async () => {
  stubFetch(() => jsonResponse({ displayName: "Taro" }));
  render(<DashboardPage />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading your dashboard…");
  expect(await screen.findByText("view:Taro")).toBeInTheDocument();
});

test("dashboard page shows the request error", async () => {
  stubFetch(() => {
    throw new TypeError("offline");
  });
  render(<DashboardPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server. Is the backend running?");
});

test("study page lists lessons and marks the preselected one as Continue", async () => {
  nav.lesson.current = "l1";
  studyFetch();
  render(<StudyPage />);
  expect(await screen.findByText("Greetings")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Start" })).toHaveLength(1);
});

async function startFirstLesson() {
  fireEvent.click((await screen.findAllByRole("button", { name: "Start" }))[0]);
}

test("study page starts a session and logs the time when completed", async () => {
  const fetchMock = studyFetch();
  render(<StudyPage />);
  await startFirstLesson();

  expect(await screen.findByText("In progress")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Complete session" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Session logged: 5 min. Nice work.");
  const completeCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/complete"));
  expect(JSON.parse(String(completeCall?.[1]?.body)).durationMinutes).toBeGreaterThanOrEqual(1);
});

test("study page shows errors when lessons fail to load", async () => {
  studyFetch({ lessonsFail: true });
  render(<StudyPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server. Is the backend running?");
});

test("study page shows errors when starting a session fails", async () => {
  studyFetch({ startFails: true });
  render(<StudyPage />);
  await startFirstLesson();
  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server. Is the backend running?");
});

test("study page shows errors when completing a session fails", async () => {
  studyFetch({ completeFails: true });
  render(<StudyPage />);
  await startFirstLesson();
  fireEvent.click(await screen.findByRole("button", { name: "Complete session" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server. Is the backend running?");
});

test("root page redirects to the dashboard", () => {
  HomePage();
  expect(nav.redirect).toHaveBeenCalledWith("/dashboard");
});

test("app layout wraps pages in the app shell", () => {
  expect(AppLayout({ children: null }).type).toBe(AppShell);
});

test("auth pages render the matching form mode", () => {
  expect(LoginPage().props).toEqual({ mode: "login" });
  expect(RegisterPage().props).toEqual({ mode: "register" });
});

test("root layout and web manifest are configured", () => {
  expect(RootLayout({ children: null }).type).toBe("html");
  expect(manifest().name).toBe("NAVI語");
});
