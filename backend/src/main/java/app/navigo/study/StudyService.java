package app.navigo.study;

import app.navigo.common.ApiException;
import app.navigo.study.StudyDtos.LessonView;
import app.navigo.study.StudyDtos.SessionView;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudyService {
    private final JdbcClient jdbc;

    public StudyService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<LessonView> lessons() {
        return jdbc.sql("SELECT id, slug, title, summary, lesson_type, jlpt_level, estimated_minutes FROM lessons ORDER BY jlpt_level DESC, position")
                .query((rs, i) -> new LessonView(rs.getObject("id", UUID.class), rs.getString("slug"), rs.getString("title"),
                        rs.getString("summary"), rs.getString("lesson_type"), rs.getString("jlpt_level"),
                        rs.getInt("estimated_minutes")))
                .list();
    }

    /** Starts a session, or resumes the learner's open session for the same lesson. */
    @Transactional
    public SessionView start(UUID userId, UUID lessonId) {
        if (lessonId != null) {
            int n = jdbc.sql("SELECT COUNT(*) FROM lessons WHERE id = :id").param("id", lessonId).query(Integer.class).single();
            if (n == 0) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Lesson not found");
            }
            var open = jdbc.sql("SELECT id FROM study_sessions WHERE user_id = :u AND lesson_id = :l AND completed_at IS NULL ORDER BY started_at DESC LIMIT 1")
                    .param("u", userId).param("l", lessonId).query(UUID.class).optional();
            if (open.isPresent()) {
                return find(userId, open.get());
            }
        }
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO study_sessions (id, user_id, lesson_id, started_at) VALUES (:id, :u, :l, :t)")
                .param("id", id).param("u", userId).param("l", lessonId)
                .param("t", OffsetDateTime.now(ZoneOffset.UTC)).update();
        return find(userId, id);
    }

    @Transactional
    public SessionView complete(UUID userId, UUID sessionId, int minutes) {
        int updated = jdbc.sql("UPDATE study_sessions SET completed_at = :t, duration_minutes = :m WHERE id = :id AND user_id = :u AND completed_at IS NULL")
                .param("t", OffsetDateTime.now(ZoneOffset.UTC)).param("m", minutes)
                .param("id", sessionId).param("u", userId).update();
        if (updated == 0) {
            find(userId, sessionId); // 404 if not the learner's session
            throw new ApiException(HttpStatus.CONFLICT, "Session is already completed");
        }
        return find(userId, sessionId);
    }

    private SessionView find(UUID userId, UUID id) {
        return jdbc.sql("SELECT id, lesson_id, started_at, completed_at, duration_minutes FROM study_sessions WHERE id = :id AND user_id = :u")
                .param("id", id).param("u", userId)
                .query((rs, i) -> {
                    OffsetDateTime done = rs.getObject("completed_at", OffsetDateTime.class);
                    int dur = rs.getInt("duration_minutes");
                    return new SessionView(rs.getObject("id", UUID.class), rs.getObject("lesson_id", UUID.class),
                            rs.getObject("started_at", OffsetDateTime.class).toInstant(),
                            done == null ? null : done.toInstant(), rs.wasNull() ? null : dur);
                })
                .optional().orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Study session not found"));
    }
}
