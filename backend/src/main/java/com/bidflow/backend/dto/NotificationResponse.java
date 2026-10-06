package com.bidflow.backend.dto;

import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        String title,
        String message,
        Boolean isRead,
        Long auctionItemId,
        OffsetDateTime createdAt
) {}
