package com.bidflow.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String fullName,
        BigDecimal walletBalance,
        OffsetDateTime createdAt
) {}
