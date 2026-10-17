package app.navigo.study;

import app.navigo.study.StudyDtos.CompleteSessionRequest;
import app.navigo.study.StudyDtos.LessonView;
import app.navigo.study.StudyDtos.SessionView;
import app.navigo.study.StudyDtos.StartSessionRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class StudyController {
    private final StudyService service;

    public StudyController(StudyService service) {
        this.service = service;
    }

    @GetMapping("/lessons")
    public List<LessonView> lessons() {
        return service.lessons();
    }

    @PostMapping("/study-sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionView start(@AuthenticationPrincipal Jwt jwt, @RequestBody(required = false) StartSessionRequest request) {
        return service.start(UUID.fromString(jwt.getSubject()), request == null ? null : request.lessonId());
    }

    @PostMapping("/study-sessions/{id}/complete")
    public SessionView complete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                @Valid @RequestBody CompleteSessionRequest request) {
        return service.complete(UUID.fromString(jwt.getSubject()), id, request.durationMinutes());
    }
}
