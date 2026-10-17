package app.navigo.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;

class StreakTest {
    private final LocalDate today = LocalDate.of(2026, 3, 10);

    @Test
    void emptyIsZero() {
        assertThat(DashboardService.streak(Set.of(), today)).isZero();
    }

    @Test
    void countsConsecutiveDaysIncludingToday() {
        assertThat(DashboardService.streak(Set.of(today, today.minusDays(1), today.minusDays(2)), today)).isEqualTo(3);
    }

    @Test
    void streakSurvivesUntilEndOfToday() {
        assertThat(DashboardService.streak(Set.of(today.minusDays(1), today.minusDays(2)), today)).isEqualTo(2);
    }

    @Test
    void gapBreaksStreak() {
        assertThat(DashboardService.streak(Set.of(today.minusDays(2)), today)).isZero();
        assertThat(DashboardService.streak(Set.of(today, today.minusDays(2)), today)).isEqualTo(1);
    }
}
