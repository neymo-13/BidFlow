package com.bidflow.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * ข้อมูลที่ client ส่งมาตอนฝากเงิน
 * POST /api/wallet/{userId}/deposit
 * { "amount": 5000.00 }
 */
public record DepositRequest(

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be greater than 0")
        BigDecimal amount
) {}
