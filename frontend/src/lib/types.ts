export interface User { id: string; email: string; displayName: string }
export interface AuthResponse { accessToken: string; expiresInSeconds: number; user: User }
export interface Lesson {
  id: string; slug: string; title: string; summary: string;
  lessonType: string; jlptLevel: string; estimatedMinutes: number;
}
export interface Objective { type: string; title: string; target: number; completed: number }
export interface DayStat { date: string; minutes: number; sessions: number }
export interface SkillScore { skill: string; score: number | null }
export interface Dashboard {
  displayName: string;
  level: { level: string; source: "SELF_REPORTED" | "ASSESSMENT"; targetLevel: string };
  objectives: Objective[];
  vocabularyRetention: number | null;
  grammarMastery: number | null;
  skills: SkillScore[];
  totalSpeakingSessions: number;
  recentSpeaking: { scenario: string; startedAt: string }[];
  streakDays: number;
  weekly: { sessions: number; minutes: number; reviews: number; days: DayStat[] };
  recommendedLesson: Lesson | null;
}
export interface StudySession {
  id: string; lessonId: string | null; startedAt: string; completedAt: string | null; durationMinutes: number | null;
}
