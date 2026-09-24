package com.bidflow.backend.dto;

import com.bidflow.backend.enums.AuctionStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AuctionSummaryResponse(
        Long id,
        String title,
        BigDecimal currentPrice,
        AuctionStatus status,
        OffsetDateTime endTime,
        Integer totalBids,
        String sellerUsername
) {}
