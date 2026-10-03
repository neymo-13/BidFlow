package com.bidflow.backend.controller;

import com.bidflow.backend.dto.AdminUserResponse;
import com.bidflow.backend.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

// สิทธิ์ ADMIN ตรวจที่ SecurityConfig (/api/admin/**)
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    // =====================================================
    // รายชื่อผู้ใช้ + ค้นหา
    // GET /api/admin/users?q=alice&page=0&size=20 (size สูงสุด 50)
    // =====================================================
    @GetMapping
    public Page<AdminUserResponse> listUsers(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminUserService.listUsers(q, page, size);
    }

    // =====================================================
    // ระงับ — admin ระงับไม่ได้ (400)
    // POST /api/admin/users/{id}/suspend
    // =====================================================
    @PostMapping("/{id}/suspend")
    public AdminUserResponse suspendUser(@PathVariable Long id) {
        return adminUserService.setSuspended(id, true, getCurrentUsername());
    }

    // =====================================================
    // ปลดระงับ
    // POST /api/admin/users/{id}/unsuspend
    // =====================================================
    @PostMapping("/{id}/unsuspend")
    public AdminUserResponse unsuspendUser(@PathVariable Long id) {
        return adminUserService.setSuspended(id, false, getCurrentUsername());
    }

    private String getCurrentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
