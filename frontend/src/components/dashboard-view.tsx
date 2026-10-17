import Link from "next/link";
import type { Dashboard } from "@/lib/types";
import { buttonVariants } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

const pct = (v: number | null) => (v === null ? null : Math.round(v * 100));
const SKILL_LABEL: Record<string, string> = {
  VOCABULARY: "Vocabulary", GRAMMAR: "Grammar", READING: "Reading",
  LISTENING: "Listening", SPEAKING: "Speaking", SENTENCE_CONSTRUCTION: "Sentences",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardTitle>{label}</CardTitle>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function DashboardView({ data }: { data: Dashboard }) {
  const maxMinutes = Math.max(1, ...data.weekly.days.map((d) => d.minutes));
  const rec = data.recommendedLesson;
  const retention = pct(data.vocabularyRetention);
  const grammar = pct(data.grammarMastery);
  const levelHint = data.level.source === "SELF_REPORTED"
    ? `Self-reported · aiming for ${data.level.targetLevel}`
    : `Estimated from assessments · aiming for ${data.level.targetLevel}`;

  return (
    <div className="fade-up space-y-6">
      <header>
        <p className="text-sm text-muted">こんにちは、{data.displayName}</p>
        <h1 className="mt-1 text-2xl font-semibold">Today</h1>
      </header>

      <Card className="border-accent/40">
        <CardTitle>Continue studying</CardTitle>
        {rec ? (
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-medium">{rec.title}</p>
              <p className="text-sm text-muted">{rec.summary}</p>
              <p className="mt-1 text-xs text-muted">{rec.jlptLevel} · {rec.lessonType.replace("_", " ").toLowerCase()} · ~{rec.estimatedMinutes} min</p>
            </div>
            <Link href={`/study?lesson=${rec.id}`} className={buttonVariants()}>Continue</Link>
          </div>
        ) : (
          <p className="mt-3 text-muted">You have completed every available lesson. New content is on the way.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="JLPT level" value={data.level.level} hint={levelHint} />
        <Stat label="Study streak" value={`${data.streakDays} day${data.streakDays === 1 ? "" : "s"}`} />
        <Stat label="Vocab retention" value={retention === null ? "—" : `${retention}%`} hint={retention === null ? "No reviews yet" : "Last 30 days"} />
        <Stat label="Grammar mastery" value={grammar === null ? "—" : `${grammar}%`} hint={grammar === null ? "Not assessed yet" : "Latest assessment"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Daily objectives</CardTitle>
          <ul className="mt-4 space-y-4">
            {data.objectives.map((o) => (
              <li key={o.type}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{o.title}</span><span className="text-muted">{o.completed}/{o.target}</span>
                </div>
                <Progress value={(o.completed / o.target) * 100} label={o.title} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>This week</CardTitle>
          <p className="mt-3 text-sm text-muted">
            {data.weekly.minutes} min · {data.weekly.sessions} sessions · {data.weekly.reviews} reviews
          </p>
          <ol className="mt-4 flex h-28 items-end gap-2" aria-label="Minutes studied per day">
            {data.weekly.days.map((d) => (
              <li key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end">
                  <div className="w-full rounded-t bg-accent/80" style={{ height: `${(d.minutes / maxMinutes) * 100}%`, minHeight: d.minutes ? 4 : 2, opacity: d.minutes ? 1 : 0.25 }}
                    title={`${d.date}: ${d.minutes} min`} />
                </div>
                <span className="text-[10px] text-muted">{new Date(d.date + "T00:00").toLocaleDateString("en", { weekday: "narrow" })}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardTitle>Skills</CardTitle>
          <ul className="mt-4 space-y-3">
            {data.skills.map((s) => (
              <li key={s.skill} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-muted">{SKILL_LABEL[s.skill] ?? s.skill}</span>
                {s.score === null ? <span className="text-xs text-muted">Not assessed</span>
                  : <Progress className="flex-1" value={s.score * 100} label={SKILL_LABEL[s.skill] ?? s.skill} />}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Speaking practice</CardTitle>
          {data.recentSpeaking.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No conversations yet. The AI tutor arrives in Phase 3.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.recentSpeaking.map((s) => (
                <li key={s.startedAt} className="flex justify-between"><span>{s.scenario}</span>
                  <span className="text-muted">{new Date(s.startedAt).toLocaleDateString()}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
