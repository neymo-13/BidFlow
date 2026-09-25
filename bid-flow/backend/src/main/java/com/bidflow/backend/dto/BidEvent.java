package com.bidflow.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BidEvent(
        String type,             // "BID_PLACED"
        Long auctionId,
        Long bidId,
        Long bidderId,
        String bidderUsername,
        BigDecimal amount,
        Long sequence,
        BigDecimal currentPrice,
        OffsetDateTime timestamp
) {}
