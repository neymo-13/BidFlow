package com.bidflow.backend.dto;

import com.bidflow.backend.enums.Role;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

// สำหรับหน้า admin — ไม่มี password hash / google sub (บอกแค่ว่าเชื่อม Google แล้วหรือยัง)
public record AdminUserResponse(
        Long id,
        String username,
        String email,
        String fullName,
        Role role,
        boolean suspended,
        boolean googleLinked,
        BigDecimal walletBalance,
        OffsetDateTime createdAt
) {}
