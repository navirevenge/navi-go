package app.navigo.user;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerProfileRepository extends JpaRepository<LearnerProfile, UUID> {
}
