package com.bidflow.backend.dto;

import com.bidflow.backend.enums.Role;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String fullName,
        BigDecimal walletBalance,
        OffsetDateTime createdAt,
        Role role               // USER / ADMIN — frontend ใช้แสดงเมนู Admin (สิทธิ์จริงตรวจที่ backend)
) {}
