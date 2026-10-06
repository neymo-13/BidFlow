package com.bidflow.backend.controller;

import com.bidflow.backend.dto.MyBidResponse;
import com.bidflow.backend.service.BidService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

// แยกจาก BidController เพราะ BidController ผูก path ไว้ที่ /api/auctions/{auctionId}/bids ทั้งคลาส
@RestController
@RequestMapping("/api/bids")
@RequiredArgsConstructor
public class MyBidController {

    private final BidService bidService;

    // =====================================================
    // My Bids — auction ที่ฉันเคยบิด (1 แถวต่อ auction, บิดล่าสุดก่อน)
    // GET /api/bids/me?page=0&size=20 (size สูงสุด 50)
    // =====================================================
    @GetMapping("/me")
    public Page<MyBidResponse> getMyBids(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return bidService.getMyBids(username, page, size);
    }
}
