package com.bidflow.backend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Collection;
import java.util.Objects;
import java.util.Set;

// ตรวจ Google ID token (credential จากปุ่ม Google Identity Services) ที่ server เอง — ไม่เชื่อข้อมูลผู้ใช้ที่ browser ส่งมา
// ตรวจ: ลายเซ็น RS256 กับ public key ของ Google (JWKS) · iss · aud = Client ID ของเรา · exp · sub · email · email_verified
@Component
public class GoogleTokenVerifier {

    static final String JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
    private static final Duration CLOCK_SKEW = Duration.ofSeconds(60);

    private final String clientId;
    private final NimbusJwtDecoder decoder;   // null = ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID

    @Autowired
    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this(clientId, clientId.isBlank() ? null : NimbusJwtDecoder.withJwkSetUri(JWK_SET_URI).build());
    }

    // unit test ส่ง decoder ที่ใช้ public key ของเทสต์ — validator ชุดเดียวกับของจริง
    GoogleTokenVerifier(String clientId, NimbusJwtDecoder decoder) {
        this.clientId = clientId.trim();
        this.decoder = decoder;
        if (decoder != null) {
            decoder.setJwtValidator(validator(this.clientId));
        }
    }

    public boolean isConfigured() {
        return decoder != null;
    }

    // token ไม่ผ่าน → BadCredentialsException (401) · ดึง public key ของ Google ไม่ได้ → 503
    public GoogleUser verify(String credential) {
        if (!isConfigured()) {
            throw new IllegalStateException("Google sign-in is not configured (GOOGLE_CLIENT_ID is empty)");
        }
        if (credential == null || credential.isBlank()) {
            throw new BadCredentialsException("Invalid Google credential");
        }

        Jwt jwt;
        try {
            jwt = decoder.decode(credential);
        } catch (BadJwtException e) {
            throw new BadCredentialsException("Invalid Google credential", e);
        } catch (JwtException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Google sign-in is temporarily unavailable. Please try again.", e);
        }

        return new GoogleUser(jwt.getSubject(), jwt.getClaimAsString("email"), jwt.getClaimAsString("name"));
    }

    static OAuth2TokenValidator<Jwt> validator(String clientId) {
        return new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(CLOCK_SKEW),
                new JwtClaimValidator<Object>(JwtClaimNames.EXP, Objects::nonNull),
                new JwtClaimValidator<Object>(JwtClaimNames.ISS,
                        iss -> iss != null && ISSUERS.contains(iss.toString())),
                new JwtClaimValidator<Collection<String>>(JwtClaimNames.AUD,
                        aud -> aud != null && aud.contains(clientId)),
                new JwtClaimValidator<Object>(JwtClaimNames.SUB,
                        sub -> sub instanceof String s && !s.isBlank()),
                new JwtClaimValidator<Object>("email",
                        email -> email instanceof String s && !s.isBlank()),
                new JwtClaimValidator<Object>("email_verified",
                        verified -> Boolean.TRUE.equals(verified) || "true".equals(verified))
        );
    }

    // ข้อมูลที่ใช้จาก token — sub = ตัวตนถาวรของบัญชี Google (อีเมลเปลี่ยนได้)
    public record GoogleUser(String subject, String email, String name) {}
}
