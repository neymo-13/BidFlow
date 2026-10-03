package com.bidflow.backend.service;

import com.bidflow.backend.dto.AuthResponse;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.security.GoogleTokenVerifier;
import com.bidflow.backend.security.GoogleTokenVerifier.GoogleUser;
import com.bidflow.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

// Google sign-in: ตรวจ ID token → จับคู่หรือสร้างบัญชี → ออก JWT ของเราเหมือน login ปกติ
// การจับคู่ (design 12.4): google_sub ตรง → ใช้บัญชีนั้น · อีเมลตรง → เชื่อม google_sub (ตัวเลือก (a)) · ไม่มีทั้งคู่ → สร้างใหม่
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleAuthService {

    static final int USERNAME_MIN = 3;
    static final int USERNAME_MAX = 40;
    private static final int MAX_USERNAME_SUFFIX = 100;
    private static final int EMAIL_MAX = 100;        // users.email VARCHAR(100)
    private static final int FULL_NAME_MAX = 100;    // users.full_name VARCHAR(100)
    private static final BigDecimal WELCOME_BALANCE = new BigDecimal("10000.00");   // เท่าการสมัครปกติ

    private final GoogleTokenVerifier googleTokenVerifier;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final TransactionTemplate transactionTemplate;

    public AuthResponse login(String credential) {
        if (!googleTokenVerifier.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google sign-in is not configured");
        }

        // ตรวจ token นอก transaction — อาจต้องดึง public key ของ Google ผ่านเครือข่าย
        GoogleUser googleUser = googleTokenVerifier.verify(credential);

        User user;
        try {
            user = transactionTemplate.execute(status -> findOrCreate(googleUser));
        } catch (DataIntegrityViolationException e) {
            // request ซ้อนกันตอนสร้าง/เชื่อมบัญชีครั้งแรก → อีก request บันทึกไปก่อน → หาใหม่ 1 ครั้ง (transaction ใหม่)
            log.info("Google sign-in hit a unique constraint, retrying once");
            try {
                user = transactionTemplate.execute(status -> findOrCreate(googleUser));
            } catch (DataIntegrityViolationException again) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Could not complete Google sign-in. Please try again.");
            }
        }

        return new AuthResponse(
                jwtService.generateToken(user),
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName()
        );
    }

    private User findOrCreate(GoogleUser googleUser) {
        // 1. เคย login ด้วย Google บัญชีนี้แล้ว — sub คือตัวตนถาวร (อีเมลใน Google เปลี่ยนได้)
        Optional<User> bySub = userRepository.findByGoogleSub(googleUser.subject());
        if (bySub.isPresent()) {
            return requireNotSuspended(bySub.get());
        }

        // 2. อีเมลตรงกับบัญชีเดิม → เชื่อม Google เข้าบัญชีนั้น (รหัสผ่านเดิมยังใช้ได้)
        Optional<User> byEmail = findByEmail(googleUser.email());
        if (byEmail.isPresent()) {
            User user = requireNotSuspended(byEmail.get());
            if (user.getGoogleSub() != null) {
                // sub ต่างจากที่ผูกไว้ (ถ้าตรงจะเจอในข้อ 1 แล้ว) เช่น บัญชี Google เดิมถูกลบแล้วสร้างใหม่ด้วยอีเมลเดิม
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This email is already linked to a different Google account");
            }
            user.setGoogleSub(googleUser.subject());
            User linked = userRepository.saveAndFlush(user);
            log.info("Linked Google account to existing user '{}' (id={}) by email", linked.getUsername(), linked.getId());
            return linked;
        }

        // 3. ผู้ใช้ใหม่
        return createUser(googleUser);
    }

    // ถ้ามีหลายบัญชีที่อีเมลต่างกันแค่ตัวพิมพ์ ใช้บัญชีที่ตรงทุกตัวอักษร · ไม่มี → 409 (ไม่เดาว่าเป็นบัญชีไหน)
    private Optional<User> findByEmail(String email) {
        List<User> matches = userRepository.findByEmailIgnoreCase(email);
        if (matches.size() > 1) {
            matches = matches.stream().filter(user -> user.getEmail().equals(email)).toList();
            if (matches.size() != 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Several accounts use this email. Please sign in with your username and password.");
            }
        }
        return matches.stream().findFirst();
    }

    private static User requireNotSuspended(User user) {
        if (user.isSuspended()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account suspended");
        }
        return user;
    }

    private User createUser(GoogleUser googleUser) {
        String email = googleUser.email();
        if (email.length() > EMAIL_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Google account email is longer than " + EMAIL_MAX + " characters");
        }

        String username = availableUsername(usernameBase(email));
        User user = User.builder()
                .username(username)
                .email(email)
                .fullName(fullName(googleUser.name(), username))
                .walletBalance(WELCOME_BALANCE)
                .googleSub(googleUser.subject())
                .build();   // passwordHash = null → login ด้วยรหัสผ่านไม่ได้ · role = USER

        User saved = userRepository.saveAndFlush(user);
        log.info("Created user '{}' (id={}) via Google sign-in", saved.getUsername(), saved.getId());
        return saved;
    }

    // ส่วนหน้า @ → ตัวเล็ก · อักขระที่ไม่ใช่ a-z 0-9 _ เป็น _ · ยาว 3–40
    static String usernameBase(String email) {
        int at = email.lastIndexOf('@');
        String local = at >= 0 ? email.substring(0, at) : email;
        String base = local.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]", "_");
        if (base.length() > USERNAME_MAX) {
            base = base.substring(0, USERNAME_MAX);
        }
        if (base.length() < USERNAME_MIN) {
            base = base + "_user";
        }
        return base;
    }

    // ชนแล้วต่อ _2, _3, … (ยาวสุด 40 + "_100" ยังไม่เกิน 50 ของ users.username)
    private String availableUsername(String base) {
        if (!userRepository.existsByUsername(base)) {
            return base;
        }
        for (int n = 2; n <= MAX_USERNAME_SUFFIX; n++) {
            String candidate = base + "_" + n;
            if (!userRepository.existsByUsername(candidate)) {
                return candidate;
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Could not choose a username for this Google account. Please register with a username and password.");
    }

    // Google ไม่ส่ง name มา → ใช้ username แทน (full_name ห้ามว่าง)
    private static String fullName(String name, String fallback) {
        String value = name == null || name.isBlank() ? fallback : name.strip();
        return value.length() > FULL_NAME_MAX ? value.substring(0, FULL_NAME_MAX) : value;
    }
}
