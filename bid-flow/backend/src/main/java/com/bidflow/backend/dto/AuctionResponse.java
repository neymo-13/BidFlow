package com.bidflow.backend.dto;

import com.bidflow.backend.enums.AuctionStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AuctionResponse(
        Long id,
        Long sellerId,
        String sellerUsername,
        Long winnerId,
        String winnerUsername,
        String title,
        String description,
        BigDecimal startPrice,
        BigDecimal minIncrement,
        BigDecimal currentPrice,
        AuctionStatus status,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        Integer totalBids,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
