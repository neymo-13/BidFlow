package com.bidflow.backend.dto;

import java.math.BigDecimal;

/**
 * Response สำหรับดูยอดเงินใน wallet
 * GET /api/wallet/{userId}
 */
public record WalletResponse(
        Long userId,
        String username,
        BigDecimal balance
) {}