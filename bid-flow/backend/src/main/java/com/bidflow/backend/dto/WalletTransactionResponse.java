package com.bidflow.backend.dto;

import com.bidflow.backend.enums.ReferenceType;
import com.bidflow.backend.enums.TransactionType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Response สำหรับ transaction แต่ละรายการ (ใช้ใน statement)
 * GET /api/wallet/{userId}/transactions
 */
public record WalletTransactionResponse(
        Long id,
        TransactionType type,
        BigDecimal amount,
        BigDecimal balanceAfter,
        ReferenceType referenceType,
        Long referenceId,
        String description,
        OffsetDateTime createdAt
) {}