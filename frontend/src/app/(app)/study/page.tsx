"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Lesson, StudySession } from "@/lib/types";

function StudyContent() {
  const preselected = useSearchParams().get("lesson");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    api.lessons().then(setLessons).catch((e: Error) => setError(e.message));
  }, []);

  const lesson = lessons.find((l) => l.id === (session?.lessonId ?? preselected));

  async function start(l: Lesson) {
    setError(null);
    try {
      setSession(await api.startSession(l.id));
      setDone(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function finish() {
    if (!session) return;
    const minutes = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
    try {
      const res = await api.completeSession(session.id, Math.min(minutes, 600));
      setDone(res.durationMinutes);
      setSession(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="fade-up space-y-6">
      <h1 className="text-2xl font-semibold">Study</h1>
      {error && <p role="alert" className="text-accent">{error}</p>}
      {done !== null && <p role="status" className="text-muted">Session logged: {done} min. Nice work.</p>}
      {session && lesson && (
        <Card className="border-accent/40">
          <p className="text-sm text-accent">In progress</p>
          <p className="mt-1 text-lg font-medium">{lesson.title}</p>
          <p className="text-sm text-muted">Lesson content and exercises arrive in Phase 2. For now, this logs your study time.</p>
          <Button className="mt-4" onClick={finish}>Complete session</Button>
        </Card>
      )}
      <ul className="space-y-3">
        {lessons.map((l) => (
          <li key={l.id}>
            <Card className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-muted">{l.summary}</p>
                <p className="mt-1 text-xs text-muted">{l.jlptLevel} · ~{l.estimatedMinutes} min</p>
              </div>
              <Button variant="secondary" onClick={() => start(l)} disabled={session !== null}>
                {preselected === l.id && !session ? "Continue" : "Start"}
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<p role="status" className="text-muted">Loading…</p>}>
      <StudyContent />
    </Suspense>
  );
}
