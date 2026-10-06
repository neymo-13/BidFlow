package com.bidflow.backend.service;

import com.bidflow.backend.dto.AuthResponse;
import com.bidflow.backend.dto.LoginRequest;
import com.bidflow.backend.dto.RegisterRequest;
import com.bidflow.backend.dto.UserResponse;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.exception.UserNotFoundException;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // =====================================================
    // 1. Register
    // =====================================================
    @Transactional
    public AuthResponse register(RegisterRequest request) {

        // เช็คซ้ำ
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already exists: " + request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists: " + request.email());
        }

        // Hash password
        String passwordHash = passwordEncoder.encode(request.password());

        // สร้าง User
        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .passwordHash(passwordHash)
                .fullName(request.fullName())
                .walletBalance(new BigDecimal("10000.00"))   // ← โบนัสต้อนรับ
                .build();

        // Save
        User saved = userRepository.save(user);

        // Generate JWT
        String token = jwtService.generateToken(saved);

        // Return
        return new AuthResponse(
                token,
                saved.getId(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getFullName()
        );
    }

    // =====================================================
    // 2. Login
    // =====================================================
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {

        // โหลด user
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        // เช็ค password (บัญชีที่สมัครผ่าน Google ไม่มีรหัสผ่าน → ข้อความเดียวกับรหัสผิด)
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        // ถูกระงับ — ตรวจหลังรหัสผ่าน คนที่ไม่รู้รหัสจะไม่รู้ว่าบัญชีนี้ถูกระงับ
        if (user.isSuspended()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account suspended");
        }

        // Generate JWT
        String token = jwtService.generateToken(user);

        // Return
        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName()
        );
    }

    // =====================================================
    // 3. Get current user profile
    // =====================================================
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getWalletBalance(),
                user.getCreatedAt(),
                user.getRole()
        );
    }
}
