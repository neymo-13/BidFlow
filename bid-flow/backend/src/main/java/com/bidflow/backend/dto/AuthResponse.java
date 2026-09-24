package com.bidflow.backend.dto;

public record AuthResponse(
        String token,
        String tokenType,        // "Bearer"
        Long userId,
        String username,
        String email,
        String fullName
) {
    // Helper constructor
    public AuthResponse(String token, Long userId, String username,
                        String email, String fullName) {
        this(token, "Bearer", userId, username, email, fullName);
    }
}
