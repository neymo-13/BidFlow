package com.bidflow.backend.exception;

import java.time.OffsetDateTime;
import java.util.Map;

public record ErrorResponse(
        OffsetDateTime timestamp,
        int status, // HTTP status code
        String error,
        String message,
        String path,
        Map<String, String> details      // ← สำหรับ validation errors
) {
}