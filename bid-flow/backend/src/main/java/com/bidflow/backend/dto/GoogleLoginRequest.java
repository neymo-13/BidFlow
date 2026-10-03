package com.bidflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// credential = Google ID token ที่ปุ่ม Google Identity Services ส่งให้ frontend
public record GoogleLoginRequest(

        @NotBlank(message = "Google credential is required")
        @Size(max = 8192, message = "Google credential is too long")
        String credential
) {}
