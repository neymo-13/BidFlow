package com.bidflow.backend.dto;

// สำหรับหน้า admin: รวมหมวดที่ซ่อน + จำนวน auction ที่ใช้หมวดนี้ (ทุก status)
public record AdminCategoryResponse(
        Long id,
        String name,
        String slug,
        boolean active,
        long auctionCount
) {}
