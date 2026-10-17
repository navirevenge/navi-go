package app.navigo.dashboard;

import app.navigo.study.StudyDtos.LessonView;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class DashboardDtos {
    private DashboardDtos() {
    }

    /** source is SELF_REPORTED until the learner has skill assessments; the level is an estimate, not a test result. */
    public record LevelEstimate(String level, String source, String targetLevel) {
    }

    public record Objective(String type, String title, int target, int completed) {
    }

    public record DayStat(LocalDate date, int minutes, int sessions) {
    }

    public record WeeklyStats(int sessions, int minutes, int reviews, List<DayStat> days) {
    }

    public record SkillScore(String skill, Double score) {
    }

    public record SpeakingEntry(String scenario, Instant startedAt) {
    }

    public record Dashboard(String displayName, LevelEstimate level, List<Objective> objectives, Double vocabularyRetention,
                            Double grammarMastery, List<SkillScore> skills, int totalSpeakingSessions,
                            List<SpeakingEntry> recentSpeaking, int streakDays, WeeklyStats weekly,
                            LessonView recommendedLesson) {
    }
}
