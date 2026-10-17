import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/components/dashboard-view";
import type { Dashboard } from "@/lib/types";

vi.mock("next/link", () => ({ default: ({ href, children, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...p}>{children}</a> }));

const base: Dashboard = {
  displayName: "Taro",
  level: { level: "N5", source: "SELF_REPORTED", targetLevel: "N3" },
  objectives: [{ type: "STUDY_MINUTES", title: "Study 30 minutes", target: 30, completed: 15 }],
  vocabularyRetention: null,
  grammarMastery: null,
  skills: [{ skill: "GRAMMAR", score: null }],
  totalSpeakingSessions: 0,
  recentSpeaking: [],
  streakDays: 1,
  weekly: { sessions: 0, minutes: 0, reviews: 0, days: [{ date: "2026-03-10", minutes: 0, sessions: 0 }] },
  recommendedLesson: { id: "abc", slug: "s", title: "Greetings", summary: "Hi", lessonType: "VOCABULARY", jlptLevel: "N5", estimatedMinutes: 10 },
};

test("shows continue link, honest empty states and objective progress", () => {
  render(<DashboardView data={base} />);
  expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/study?lesson=abc");
  expect(screen.getByText("No reviews yet")).toBeInTheDocument();
  expect(screen.getByText("Not assessed")).toBeInTheDocument();
  expect(screen.getByText("Self-reported · aiming for N3")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Study 30 minutes" })).toHaveAttribute("aria-valuenow", "50");
  expect(screen.getByText("1 day")).toBeInTheDocument();
});

test("handles no remaining lessons", () => {
  render(<DashboardView data={{ ...base, recommendedLesson: null }} />);
  expect(screen.queryByRole("link", { name: "Continue" })).toBeNull();
});
