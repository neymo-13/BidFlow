package com.bidflow.backend.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Unit test ล้วน — ไม่โหลด Spring context ไม่แตะ DB/เครือข่าย
// ใช้ RSA key ที่สร้างในเทสต์แทน key ของ Google แต่ validator เป็นชุดเดียวกับของจริง
class GoogleTokenVerifierTest {

    private static final String CLIENT_ID = "test-client.apps.googleusercontent.com";

    private static RSAKey googleKey;
    private static RSAKey attackerKey;

    private GoogleTokenVerifier verifier;

    @BeforeAll
    static void generateKeys() throws JOSEException {
        googleKey = new RSAKeyGenerator(2048).keyID("google").generate();
        attackerKey = new RSAKeyGenerator(2048).keyID("attacker").generate();
    }

    @BeforeEach
    void setUp() throws JOSEException {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(googleKey.toRSAPublicKey()).build();
        verifier = new GoogleTokenVerifier(CLIENT_ID, decoder);
    }

    // token แบบที่ Google ออกให้จริง แล้วปรับ claim ตามแต่ละเทสต์
    private static String token(RSAKey signer, Consumer<JWTClaimsSet.Builder> customize) throws JOSEException {
        Instant now = Instant.now();
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .issuer("https://accounts.google.com")
                .audience(CLIENT_ID)
                .subject("110169484474386276334")
                .claim("email", "someone@gmail.com")
                .claim("email_verified", true)
                .claim("name", "Some One")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)));
        customize.accept(claims);

        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(signer.getKeyID()).build(),
                claims.build());
        jwt.sign(new RSASSASigner(signer));
        return jwt.serialize();
    }

    private static String validToken() throws JOSEException {
        return token(googleKey, c -> { });
    }

    @Test
    void validToken_returnsGoogleUser() throws JOSEException {
        GoogleTokenVerifier.GoogleUser user = verifier.verify(validToken());

        assertThat(user.subject()).isEqualTo("110169484474386276334");
        assertThat(user.email()).isEqualTo("someone@gmail.com");
        assertThat(user.name()).isEqualTo("Some One");
    }

    @Test
    void issuerWithoutScheme_isAccepted() throws JOSEException {
        assertThat(verifier.verify(token(googleKey, c -> c.issuer("accounts.google.com"))).subject())
                .isEqualTo("110169484474386276334");
    }

    @Test
    void emailVerifiedAsString_isAccepted() throws JOSEException {
        assertThat(verifier.verify(token(googleKey, c -> c.claim("email_verified", "true"))).email())
                .isEqualTo("someone@gmail.com");
    }

    @Test
    void audienceListContainingClientId_isAccepted() throws JOSEException {
        assertThat(verifier.verify(token(googleKey, c -> c.audience(List.of("other-app", CLIENT_ID)))).subject())
                .isNotBlank();
    }

    @Test
    void wrongAudience_isRejected() throws JOSEException {
        String token = token(googleKey, c -> c.audience("another-app.apps.googleusercontent.com"));
        assertRejected(token);
    }

    @Test
    void wrongIssuer_isRejected() throws JOSEException {
        assertRejected(token(googleKey, c -> c.issuer("https://evil.example.com")));
    }

    @Test
    void expiredToken_isRejected() throws JOSEException {
        Instant past = Instant.now().minusSeconds(3600);
        assertRejected(token(googleKey, c -> c
                .issueTime(Date.from(past.minusSeconds(3600)))
                .expirationTime(Date.from(past))));
    }

    @Test
    void missingExpiry_isRejected() throws JOSEException {
        assertRejected(token(googleKey, c -> c.expirationTime(null)));
    }

    @Test
    void signedWithAnotherKey_isRejected() throws JOSEException {
        assertRejected(token(attackerKey, c -> { }));
    }

    @Test
    void unverifiedEmail_isRejected() throws JOSEException {
        assertRejected(token(googleKey, c -> c.claim("email_verified", false)));
    }

    @Test
    void missingEmailVerified_isRejected() throws JOSEException {
        assertRejected(token(googleKey, c -> c.claim("email_verified", null)));
    }

    @Test
    void missingEmail_isRejected() throws JOSEException {
        assertRejected(token(googleKey, c -> c.claim("email", null)));
    }

    @Test
    void missingSubject_isRejected() throws JOSEException {
        assertRejected(token(googleKey, c -> c.subject(null)));
    }

    @Test
    void hmacSignedToken_isRejected() throws Exception {
        // alg confusion: ลองเซ็นด้วย HS256 แทน RS256
        byte[] secret = new byte[32];
        new SecureRandom().nextBytes(secret);
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256),
                SignedJWT.parse(validToken()).getJWTClaimsSet());
        jwt.sign(new MACSigner(secret));
        assertRejected(jwt.serialize());
    }

    @Test
    void unsignedToken_isRejected() throws Exception {
        PlainJWT jwt = new PlainJWT(SignedJWT.parse(validToken()).getJWTClaimsSet());
        assertRejected(jwt.serialize());
    }

    @Test
    void tamperedPayload_isRejected() throws JOSEException {
        String[] parts = validToken().split("\\.");
        String otherPayload = token(googleKey, c -> c.subject("someone-else")).split("\\.")[1];
        assertRejected(parts[0] + "." + otherPayload + "." + parts[2]);
    }

    @Test
    void garbageOrBlank_isRejected() {
        assertRejected("not-a-jwt");
        assertRejected("");
        assertRejected(null);
    }

    @Test
    void notConfigured_whenClientIdBlank() {
        GoogleTokenVerifier off = new GoogleTokenVerifier("   ");

        assertThat(off.isConfigured()).isFalse();
        assertThatThrownBy(() -> off.verify("anything")).isInstanceOf(IllegalStateException.class);
    }

    private void assertRejected(String credential) {
        assertThatThrownBy(() -> verifier.verify(credential))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid Google credential");
    }
}
