package com.bidflow.backend.controller;

import com.bidflow.backend.dto.BidResponse;
import com.bidflow.backend.dto.BidSummaryResponse;
import com.bidflow.backend.dto.PlaceBidRequest;
import com.bidflow.backend.service.BidService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auctions/{auctionId}/bids")
@RequiredArgsConstructor
public class BidController {

    private final BidService bidService;

    private String getCurrentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // =====================================================
    // Place Bid
    // POST /api/auctions/{auctionId}/bids
    // Body: { "amount": 31000 }
    // =====================================================
    @PostMapping
    public ResponseEntity<BidResponse> placeBid(
            @PathVariable Long auctionId,
            @Valid @RequestBody PlaceBidRequest request) {

        BidResponse response = bidService.placeBid(
                auctionId,
                request.amount(),
                getCurrentUsername()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // ดูประวัติ bid
    // GET /api/auctions/{auctionId}/bids?page=0&size=20
    // =====================================================
    @GetMapping
    public Page<BidSummaryResponse> getBids(
            @PathVariable Long auctionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return bidService.getAuctionBids(auctionId, page, size);
    }
}
