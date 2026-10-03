package com.bidflow.backend.controller;

import com.bidflow.backend.dto.AdminStatsResponse;
import com.bidflow.backend.service.AdminStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// สิทธิ์ ADMIN ตรวจที่ SecurityConfig (/api/admin/**)
@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final AdminStatsService adminStatsService;

    // =====================================================
    // ตัวเลขสำหรับ Admin Dashboard
    // GET /api/admin/stats
    // =====================================================
    @GetMapping
    public AdminStatsResponse getStats() {
        return adminStatsService.getStats();
    }
}
