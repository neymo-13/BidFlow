package com.bidflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// เหตุผลจะแสดงในแจ้งเตือนของผู้ขายและผู้บิด
public record CancelAuctionRequest(

        @NotBlank(message = "Reason is required")
        @Size(max = 500, message = "Reason must be at most 500 characters")
        String reason
) {}
