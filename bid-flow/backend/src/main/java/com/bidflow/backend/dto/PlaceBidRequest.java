package com.bidflow.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record PlaceBidRequest(

        @NotNull(message = "Bid amount is required")
        @Positive(message = "Bid amount must be greater than 0")
        BigDecimal amount
) {}
