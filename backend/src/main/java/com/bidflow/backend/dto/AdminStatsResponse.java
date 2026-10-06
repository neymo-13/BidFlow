package com.bidflow.backend.dto;

import com.bidflow.backend.enums.AuctionStatus;

import java.math.BigDecimal;
import java.util.Map;

// ตัวเลขสำหรับ Admin Dashboard — auctionsByStatus มีครบทุก status (ไม่มี = 0)
public record AdminStatsResponse(
        long totalUsers,
        long suspendedUsers,
        long adminUsers,
        Map<AuctionStatus, Long> auctionsByStatus,
        long totalBids,
        BigDecimal totalSales      // ผลรวมราคาสุดท้ายของ auction ที่จบแบบมีผู้ชนะ
) {}
