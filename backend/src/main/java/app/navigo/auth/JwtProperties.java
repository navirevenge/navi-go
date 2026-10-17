package app.navigo.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("navigo.jwt")
public record JwtProperties(String secret, Duration ttl) {
    public JwtProperties {
        if (secret == null || secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("navigo.jwt.secret (NAVIGO_JWT_SECRET) must be set to at least 32 bytes");
        }
        if (ttl == null) {
            ttl = Duration.ofHours(12);
        }
    }
}
