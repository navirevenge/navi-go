package app.navigo.study;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.UUID;

public final class StudyDtos {
    private StudyDtos() {
    }

    public record LessonView(UUID id, String slug, String title, String summary, String lessonType,
                             String jlptLevel, int estimatedMinutes) {
    }

    public record StartSessionRequest(UUID lessonId) {
    }

    public record CompleteSessionRequest(@Min(0) @Max(600) int durationMinutes) {
    }

    // No user_id: ownership is enforced in the WHERE clause, and the caller already knows its own id.
    public record SessionView(UUID id, UUID lessonId, Instant startedAt, Instant completedAt, Integer durationMinutes) {
    }
}
