package com.bidflow.backend.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record UpdateAuctionRequest(

        @Size(max = 150)
        String title,

        @Size(max = 5000)
        String description,

        @Positive
        BigDecimal startPrice,

        @Positive
        BigDecimal minIncrement,

        @FutureOrPresent
        OffsetDateTime startTime,

        @Future
        OffsetDateTime endTime,

        // ไม่ส่ง = ไม่เปลี่ยนหมวด
        @Positive
        Long categoryId
) {}
