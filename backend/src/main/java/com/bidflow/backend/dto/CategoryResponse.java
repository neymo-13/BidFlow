package com.bidflow.backend.dto;

// slug ใช้เป็นค่าตัวกรองใน URL (?category=cameras)
public record CategoryResponse(
        Long id,
        String name,
        String slug
) {}
