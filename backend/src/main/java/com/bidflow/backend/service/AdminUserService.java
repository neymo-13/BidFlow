package com.bidflow.backend.service;

import com.bidflow.backend.dto.AdminUserResponse;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.Role;
import com.bidflow.backend.exception.UserNotFoundException;
import com.bidflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_KEYWORD_LENGTH = 100;

    private final UserRepository userRepository;

    // =====================================================
    // รายชื่อผู้ใช้ (ใหม่สุดก่อน) · q ค้น username / email / ชื่อ แบบไม่สนตัวพิมพ์
    // =====================================================
    @Transactional(readOnly = true)
    public Page<AdminUserResponse> listUsers(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));

        if (q == null || q.isBlank()) {
            return userRepository.findAll(pageable).map(this::toResponse);
        }
        String keyword = q.trim();
        if (keyword.length() > MAX_KEYWORD_LENGTH) {
            throw new IllegalArgumentException("q must be at most " + MAX_KEYWORD_LENGTH + " characters");
        }
        String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";
        return userRepository.search(pattern, pageable).map(this::toResponse);
    }

    // =====================================================
    // ระงับ / ปลดระงับ — ระงับ admin ไม่ได้ (รวมตัวเอง) กันล็อกตัวเองออกจากระบบ
    // มีผลทันที: JwtAuthFilter อ่านสถานะจาก DB ทุก request
    // =====================================================
    @Transactional
    public AdminUserResponse setSuspended(Long userId, boolean suspended, String adminUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        if (suspended && user.getRole() == Role.ADMIN) {
            throw new IllegalArgumentException("Admins cannot be suspended");
        }

        if (user.isSuspended() != suspended) {
            user.setSuspended(suspended);
            log.info("Admin '{}' {} user '{}'", adminUsername, suspended ? "suspended" : "unsuspended", user.getUsername());
        }
        return toResponse(user);
    }

    // ให้ % _ \ ที่พิมพ์มาถูกค้นเป็นตัวอักษรจริง ไม่ใช่ wildcard
    private static String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    private AdminUserResponse toResponse(User u) {
        return new AdminUserResponse(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getFullName(),
                u.getRole(),
                u.isSuspended(),
                u.getGoogleSub() != null,
                u.getWalletBalance(),
                u.getCreatedAt()
        );
    }
}
