package app.navigo.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "learner_profiles")
public class LearnerProfile {
    @Id
    @Column(name = "user_id")
    private UUID userId;
    @Column(name = "self_reported_level", nullable = false)
    private String selfReportedLevel = "N5";
    @Column(name = "target_level", nullable = false)
    private String targetLevel = "N3";
    @Column(name = "daily_goal_minutes", nullable = false)
    private int dailyGoalMinutes = 30;
    @Column(name = "dialect_preference", nullable = false)
    private String dialectPreference = "STANDARD";
    @Column(name = "show_furigana", nullable = false)
    private boolean showFurigana = true;
    @Column(name = "show_romaji", nullable = false)
    private boolean showRomaji = false;

    protected LearnerProfile() {
    }

    public LearnerProfile(UUID userId, String selfReportedLevel) {
        this.userId = userId;
        if (selfReportedLevel != null) {
            this.selfReportedLevel = selfReportedLevel;
        }
    }

    public UUID getUserId() { return userId; }
    public String getSelfReportedLevel() { return selfReportedLevel; }
    public String getTargetLevel() { return targetLevel; }
    public int getDailyGoalMinutes() { return dailyGoalMinutes; }
    public String getDialectPreference() { return dialectPreference; }
    public boolean isShowFurigana() { return showFurigana; }
    public boolean isShowRomaji() { return showRomaji; }
}
