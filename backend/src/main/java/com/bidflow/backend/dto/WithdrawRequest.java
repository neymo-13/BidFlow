package com.bidflow.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * ข้อมูลที่ client ส่งมาตอนถอนเงิน
 * POST /api/wallet/{userId}/withdraw
 * { "amount": 1000.00 }
 */
public record WithdrawRequest(

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be greater than 0")
        BigDecimal amount
) {}