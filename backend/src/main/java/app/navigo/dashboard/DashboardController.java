package app.navigo.dashboard;

import app.navigo.dashboard.DashboardDtos.Dashboard;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping
    public Dashboard dashboard(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String timezone) {
        return service.build(UUID.fromString(jwt.getSubject()), timezone);
    }
}
