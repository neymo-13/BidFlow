package com.bidflow.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BidResponse(
        Long id,
        Long auctionItemId,
        Long bidderId,
        String bidderUsername,
        BigDecimal bidAmount,
        Long bidSequence,
        OffsetDateTime createdAt
) {}
