package com.bidflow.backend.controller;

import com.bidflow.backend.dto.AuctionSummaryResponse;
import com.bidflow.backend.dto.CancelAuctionRequest;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.service.AdminAuctionService;
import com.bidflow.backend.service.AuctionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

// สิทธิ์ ADMIN ตรวจที่ SecurityConfig (/api/admin/**)
@RestController
@RequestMapping("/api/admin/auctions")
@RequiredArgsConstructor
public class AdminAuctionController {

    private final AuctionService auctionService;
    private final AdminAuctionService adminAuctionService;

    // =====================================================
    // auction ทุก status ของทุกคน (ใหม่สุดก่อน)
    // GET /api/admin/auctions?status=DRAFT&q=leica&page=0&size=20 (size สูงสุด 50)
    // =====================================================
    @GetMapping
    public Page<AuctionSummaryResponse> listAuctions(
            @RequestParam(required = false) AuctionStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return auctionService.listForAdmin(status, q, page, size);
    }

    // =====================================================
    // ยกเลิก (DRAFT / ACTIVE) { reason } → 204
    // คืนเงินผู้นำ + แจ้งเตือนผู้ขายและผู้บิด
    // POST /api/admin/auctions/{id}/cancel
    // =====================================================
    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelAuction(
            @PathVariable Long id,
            @Valid @RequestBody CancelAuctionRequest request) {
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        adminAuctionService.cancelAuction(id, request.reason(), adminUsername);
        return ResponseEntity.noContent().build();
    }
}
