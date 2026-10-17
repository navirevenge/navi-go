package app.navigo.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 100) String displayName,
            @Pattern(regexp = "N[1-5]", message = "must be N1-N5") String currentLevel) {
    }

    public record LoginRequest(@NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 72) String password) {
    }

    public record UserView(String id, String email, String displayName) {
    }

    public record AuthResponse(String accessToken, long expiresInSeconds, UserView user) {
    }
}
