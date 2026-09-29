package com.bidflow.backend.dto;

// url = presigned GET URL อายุสั้น (bucket เป็น private)
public record AuctionImageResponse(
        Long id,
        String url,
        boolean isPrimary,
        int displayOrder
) {}
