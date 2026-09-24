package com.bidflow.backend.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreateAuctionRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 150, message = "Title must not exceed 150 characters")
        String title,

        @Size(max = 5000, message = "Description too long")
        String description,

        @NotNull(message = "Start price is required")
        @Positive(message = "Start price must be greater than 0")
        BigDecimal startPrice,

        @NotNull(message = "Min increment is required")
        @Positive(message = "Min increment must be greater than 0")
        BigDecimal minIncrement,

        @NotNull(message = "Start time is required")
        @FutureOrPresent(message = "Start time must be now or in the future")
        OffsetDateTime startTime,

        @NotNull(message = "End time is required")
        @Future(message = "End time must be in the future")
        OffsetDateTime endTime
) {}
