package com.bidflow.backend.dto;

import com.bidflow.backend.enums.AuctionStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

// 1 แถวต่อ auction ที่ผู้ใช้เคยบิด (GET /api/bids/me)
public record MyBidResponse(
        Long auctionId,
        String title,
        AuctionStatus status,
        BigDecimal currentPrice,
        OffsetDateTime endTime,
        BigDecimal myHighestBid,
        Long myBidCount,
        OffsetDateTime lastBidAt,
        Result result,
        String primaryImageUrl      // null = auction ไม่มีรูป
) {
    // ACTIVE → LEADING / OUTBID · ENDED → WON / LOST · CANCELLED → CANCELLED
    public enum Result {
        LEADING,
        OUTBID,
        WON,
        LOST,
        CANCELLED
    }
}
