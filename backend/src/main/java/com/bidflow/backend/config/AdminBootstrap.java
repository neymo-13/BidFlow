package com.bidflow.backend.config;

import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.Role;
import com.bidflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

// admin คนแรก: อ่านจาก env ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD ทุกครั้งที่เริ่มระบบ (หลัง DataSeeder)
// - ADMIN_USERNAME ว่าง → ข้าม
// - มี username นี้แล้ว → ตั้งเป็น ADMIN (ไม่แตะรหัสผ่าน)
// - ยังไม่มี → สร้างใหม่ (ต้องมีอีเมล + รหัส ≥ 8 ตัว และอีเมลต้องไม่ชนกับบัญชีอื่น)
// ไม่ลดสิทธิ์ใคร และไม่ทำให้แอปล่มถ้าตั้งค่าไม่ครบ (แค่ log)
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
@Profile("!test")
public class AdminBootstrap implements CommandLineRunner {

    private static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:}")
    private String username;

    @Value("${app.admin.email:}")
    private String email;

    @Value("${app.admin.password:}")
    private String password;

    @Override
    @Transactional
    public void run(String... args) {
        String adminUsername = username.trim();
        if (adminUsername.isEmpty()) {
            log.warn("AdminBootstrap: ADMIN_USERNAME is not set — no admin account created or promoted");
            return;
        }

        User existing = userRepository.findByUsername(adminUsername).orElse(null);
        if (existing != null) {
            promote(existing);
            return;
        }

        create(adminUsername, email.trim());
    }

    private void promote(User user) {
        if (user.isSuspended()) {
            log.warn("AdminBootstrap: '{}' is suspended — it cannot sign in until unsuspended", user.getUsername());
        }
        if (user.getRole() == Role.ADMIN) {
            log.info("AdminBootstrap: '{}' is already an admin", user.getUsername());
            return;
        }
        user.setRole(Role.ADMIN);
        log.info("AdminBootstrap: promoted existing user '{}' to ADMIN (password unchanged)", user.getUsername());
    }

    private void create(String adminUsername, String adminEmail) {
        if (adminUsername.length() < 3 || adminUsername.length() > 50) {
            log.error("AdminBootstrap: cannot create admin — ADMIN_USERNAME must be 3-50 characters");
            return;
        }
        if (adminEmail.isEmpty() || adminEmail.length() > 100 || !adminEmail.contains("@")) {
            log.error("AdminBootstrap: cannot create admin '{}' — ADMIN_EMAIL must be a valid email (at most 100 characters)",
                    adminUsername);
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            log.error("AdminBootstrap: cannot create admin '{}' — ADMIN_PASSWORD must be at least {} characters",
                    adminUsername, MIN_PASSWORD_LENGTH);
            return;
        }
        if (userRepository.existsByEmail(adminEmail)) {
            // ไม่ยึดบัญชีของคนอื่นที่ใช้อีเมลนี้อยู่
            log.error("AdminBootstrap: cannot create admin '{}' — ADMIN_EMAIL is already used by another account",
                    adminUsername);
            return;
        }

        userRepository.save(User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(password))
                .fullName("Administrator")
                .walletBalance(new BigDecimal("10000.00"))   // เท่าการสมัครปกติ
                .role(Role.ADMIN)
                .build());
        log.info("AdminBootstrap: created admin account '{}'", adminUsername);
    }
}
