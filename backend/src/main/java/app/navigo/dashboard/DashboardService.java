package app.navigo.dashboard;

import app.navigo.common.ApiException;
import app.navigo.dashboard.DashboardDtos.*;
import app.navigo.study.StudyDtos.LessonView;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private static final List<String> SKILLS = List.of("VOCABULARY", "GRAMMAR", "READING", "LISTENING", "SPEAKING", "SENTENCE_CONSTRUCTION");

    private final JdbcClient jdbc;

    public DashboardService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public Dashboard build(UUID userId, String timezone) {
        ZoneId zone = parseZone(timezone);
        LocalDate today = LocalDate.now(zone);

        var profile = jdbc.sql("SELECT u.display_name, p.self_reported_level, p.target_level, p.daily_goal_minutes FROM users u JOIN learner_profiles p ON p.user_id = u.id WHERE u.id = :u")
                .param("u", userId)
                .query((rs, i) -> new Object[]{rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4)})
                .optional().orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Learner profile not found"));
        String displayName = (String) profile[0], selfLevel = (String) profile[1], target = (String) profile[2];
        int goalMinutes = (Integer) profile[3];

        ensureObjectives(userId, today, goalMinutes);

        // Completed sessions: minutes per local day, plus the lesson types completed today.
        List<Object[]> completed = jdbc.sql("SELECT s.completed_at, COALESCE(s.duration_minutes, 0), l.lesson_type FROM study_sessions s LEFT JOIN lessons l ON l.id = s.lesson_id WHERE s.user_id = :u AND s.completed_at IS NOT NULL AND s.completed_at >= :since")
                .param("u", userId).param("since", OffsetDateTime.now(ZoneOffset.UTC).minusDays(400))
                .query((rs, i) -> new Object[]{rs.getObject(1, OffsetDateTime.class).atZoneSameInstant(zone).toLocalDate(), rs.getInt(2), rs.getString(3)})
                .list();

        Map<LocalDate, int[]> byDay = new TreeMap<>();
        int grammarCount = 0;
        for (Object[] row : completed) {
            LocalDate d = (LocalDate) row[0];
            int[] agg = byDay.computeIfAbsent(d, k -> new int[2]);
            agg[0] += (Integer) row[1];
            agg[1]++;
            if (d.equals(today) && "GRAMMAR".equals(row[2])) {
                grammarCount++;
            }
        }

        List<SpeakingEntry> recent = jdbc.sql("SELECT scenario, started_at FROM conversation_sessions WHERE user_id = :u ORDER BY started_at DESC LIMIT 5")
                .param("u", userId)
                .query((rs, i) -> new SpeakingEntry(rs.getString(1), rs.getObject(2, OffsetDateTime.class).toInstant()))
                .list();
        final int grammarToday = grammarCount;
        final int conversationsToday = jdbc.sql("SELECT COUNT(*) FROM conversation_sessions WHERE user_id = :u AND started_at >= :s AND started_at < :e")
                .param("u", userId).param("s", today.atStartOfDay(zone).toOffsetDateTime())
                .param("e", today.plusDays(1).atStartOfDay(zone).toOffsetDateTime()).query(Integer.class).single();
        int totalSpeaking = jdbc.sql("SELECT COUNT(*) FROM conversation_sessions WHERE user_id = :u").param("u", userId).query(Integer.class).single();

        int minutesToday = byDay.getOrDefault(today, new int[2])[0];
        List<Objective> objectives = jdbc.sql("SELECT objective_type, title, target_count FROM learning_objectives WHERE user_id = :u AND objective_date = :d ORDER BY objective_type")
                .param("u", userId).param("d", today)
                .query((rs, i) -> {
                    String type = rs.getString(1);
                    int done = switch (type) {
                        case "STUDY_MINUTES" -> minutesToday;
                        case "GRAMMAR_LESSON" -> grammarToday;
                        default -> conversationsToday;
                    };
                    int tgt = rs.getInt(3);
                    return new Objective(type, rs.getString(2), tgt, Math.min(done, tgt));
                }).list();

        // Weekly stats (last 7 local days including today)
        List<DayStat> days = new ArrayList<>();
        int wSessions = 0, wMinutes = 0;
        for (int k = 6; k >= 0; k--) {
            LocalDate d = today.minusDays(k);
            int[] agg = byDay.getOrDefault(d, new int[2]);
            days.add(new DayStat(d, agg[0], agg[1]));
            wMinutes += agg[0];
            wSessions += agg[1];
        }
        int reviewsWeek = jdbc.sql("SELECT COUNT(*) FROM review_events WHERE user_id = :u AND reviewed_at >= :since")
                .param("u", userId).param("since", OffsetDateTime.now(ZoneOffset.UTC).minusDays(7)).query(Integer.class).single();

        // Skills: latest assessment per skill; null means "not assessed yet".
        Map<String, Double> latest = new TreeMap<>();
        String assessedLevel = null;
        var assessments = jdbc.sql("SELECT skill, score, estimated_level FROM skill_assessments WHERE user_id = :u ORDER BY assessed_at DESC")
                .param("u", userId)
                .query((rs, i) -> new Object[]{rs.getString(1), rs.getDouble(2), rs.getString(3)}).list();
        for (Object[] a : assessments) {
            latest.putIfAbsent((String) a[0], (Double) a[1]);
            if (assessedLevel == null && a[2] != null) {
                assessedLevel = (String) a[2];
            }
        }
        List<SkillScore> skills = SKILLS.stream().map(s -> new SkillScore(s, latest.get(s))).toList();

        // Retention: share of reviews in the last 30 days recalled (rating Good/Easy).
        Double retention = jdbc.sql("SELECT COUNT(*), SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) FROM review_events WHERE user_id = :u AND reviewed_at >= :since")
                .param("u", userId).param("since", OffsetDateTime.now(ZoneOffset.UTC).minusDays(30))
                .query((rs, i) -> rs.getInt(1) == 0 ? null : (double) rs.getInt(2) / rs.getInt(1)).list().get(0);

        String level = assessedLevel != null ? assessedLevel : selfLevel;
        LevelEstimate estimate = new LevelEstimate(level, assessedLevel != null ? "ASSESSMENT" : "SELF_REPORTED", target);

        return new Dashboard(displayName, estimate, objectives, retention, latest.get("GRAMMAR"), skills, totalSpeaking,
                recent, streak(byDay.keySet(), today), new WeeklyStats(wSessions, wMinutes, reviewsWeek, days),
                recommend(userId, level));
    }

    private void ensureObjectives(UUID userId, LocalDate today, int goalMinutes) {
        int existing = jdbc.sql("SELECT COUNT(*) FROM learning_objectives WHERE user_id = :u AND objective_date = :d")
                .param("u", userId).param("d", today).query(Integer.class).single();
        if (existing > 0) {
            return;
        }
        insertObjective(userId, today, "STUDY_MINUTES", "Study " + goalMinutes + " minutes", goalMinutes);
        insertObjective(userId, today, "GRAMMAR_LESSON", "Complete a grammar lesson", 1);
        insertObjective(userId, today, "CONVERSATION", "Hold a conversation", 1);
    }

    private void insertObjective(UUID userId, LocalDate date, String type, String title, int target) {
        jdbc.sql("INSERT INTO learning_objectives (id, user_id, objective_date, objective_type, title, target_count) VALUES (:id, :u, :d, :t, :title, :n)")
                .param("id", UUID.randomUUID()).param("u", userId).param("d", date).param("t", type)
                .param("title", title).param("n", target).update();
    }

    /** Consecutive study days ending today; a streak is still alive if the learner last studied yesterday. */
    static int streak(Set<LocalDate> studyDays, LocalDate today) {
        Set<LocalDate> days = new HashSet<>(studyDays);
        LocalDate cursor = days.contains(today) ? today : today.minusDays(1);
        int count = 0;
        while (days.contains(cursor)) {
            count++;
            cursor = cursor.minusDays(1);
        }
        return count;
    }

    private LessonView recommend(UUID userId, String level) {
        String sql = "SELECT id, slug, title, summary, lesson_type, jlpt_level, estimated_minutes FROM lessons l WHERE l.id NOT IN (SELECT lesson_id FROM study_sessions WHERE user_id = :u AND completed_at IS NOT NULL AND lesson_id IS NOT NULL) ORDER BY CASE WHEN l.jlpt_level = :lvl THEN 0 ELSE 1 END, l.jlpt_level DESC, l.position LIMIT 1";
        return jdbc.sql(sql).param("u", userId).param("lvl", level)
                .query((rs, i) -> new LessonView(rs.getObject("id", UUID.class), rs.getString("slug"), rs.getString("title"),
                        rs.getString("summary"), rs.getString("lesson_type"), rs.getString("jlpt_level"), rs.getInt("estimated_minutes")))
                .optional().orElse(null);
    }

    private static ZoneId parseZone(String tz) {
        if (tz == null || tz.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown timezone");
        }
    }
}
