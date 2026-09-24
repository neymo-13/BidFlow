package com.bidflow.backend.controller;

import com.bidflow.backend.dto.UserResponse;
import com.bidflow.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;

    // =====================================================
    // GET /api/users/me
    // ดึงข้อมูล user ที่ login อยู่ (ต้องมี token)
    // =====================================================
    @GetMapping("/me")
    public UserResponse me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();          // "bob" (จาก JwtAuthFilter)

        return authService.getCurrentUser(username);
    }
}