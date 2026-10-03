package com.bidflow.backend.controller;

import com.bidflow.backend.dto.AuthResponse;
import com.bidflow.backend.dto.GoogleLoginRequest;
import com.bidflow.backend.dto.LoginRequest;
import com.bidflow.backend.dto.RegisterRequest;
import com.bidflow.backend.service.AuthService;
import com.bidflow.backend.service.GoogleAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;

    // =====================================================
    // 1. Register
    // POST /api/auth/register
    // =====================================================
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // 2. Login
    // POST /api/auth/login
    // =====================================================
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);   // 200 OK
    }

    // =====================================================
    // 3. Google sign-in
    // POST /api/auth/google  { credential }
    // 200 ทั้งบัญชีเดิมและบัญชีที่เพิ่งสร้าง · token ไม่ผ่าน 401 · ถูกระงับ 403 · อีเมลผูก Google คนอื่น 409 · ไม่ได้ตั้งค่า 503
    // =====================================================
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(
            @Valid @RequestBody GoogleLoginRequest request) {

        AuthResponse response = googleAuthService.login(request.credential());
        return ResponseEntity.ok(response);
    }
}