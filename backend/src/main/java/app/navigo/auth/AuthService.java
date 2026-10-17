package app.navigo.auth;

import app.navigo.auth.AuthDtos.AuthResponse;
import app.navigo.auth.AuthDtos.LoginRequest;
import app.navigo.auth.AuthDtos.RegisterRequest;
import app.navigo.auth.AuthDtos.UserView;
import app.navigo.common.ApiException;
import app.navigo.user.LearnerProfile;
import app.navigo.user.LearnerProfileRepository;
import app.navigo.user.User;
import app.navigo.user.UserRepository;
import java.time.Instant;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final LearnerProfileRepository profiles;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final JwtProperties props;
    private final String dummyHash;

    public AuthService(UserRepository users, LearnerProfileRepository profiles, PasswordEncoder encoder,
                       JwtEncoder jwtEncoder, JwtProperties props) {
        this.users = users;
        this.profiles = profiles;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.props = props;
        this.dummyHash = encoder.encode("navigo-dummy-password");
    }

    @Transactional
    public AuthResponse register(RegisterRequest r) {
        String email = r.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }
        User user;
        try {
            user = users.saveAndFlush(new User(email, encoder.encode(r.password()), r.displayName().trim()));
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }
        profiles.save(new LearnerProfile(user.getId(), r.currentLevel()));
        return issue(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest r) {
        User user = users.findByEmail(r.email().trim().toLowerCase(Locale.ROOT)).orElse(null);
        // Always run a hash comparison so response time does not reveal whether an account exists.
        boolean ok = encoder.matches(r.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !ok) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return issue(user);
    }

    private AuthResponse issue(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("navigo").subject(user.getId().toString())
                .issuedAt(now).expiresAt(now.plus(props.ttl())).build();
        String token = jwtEncoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new AuthResponse(token, props.ttl().toSeconds(),
                new UserView(user.getId().toString(), user.getEmail(), user.getDisplayName()));
    }
}
