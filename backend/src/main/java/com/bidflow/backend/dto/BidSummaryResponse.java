package com.bidflow.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BidSummaryResponse(
        Long id,
        String bidderUsername,
        BigDecimal bidAmount,
        Long bidSequence,
        OffsetDateTime createdAt
) {}
