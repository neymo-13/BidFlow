package com.bidflow.backend.controller;

import com.bidflow.backend.dto.AuctionResponse;
import com.bidflow.backend.dto.AuctionSummaryResponse;
import com.bidflow.backend.dto.CreateAuctionRequest;
import com.bidflow.backend.dto.UpdateAuctionRequest;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.service.AuctionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auctions")
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;

    // =====================================================
    // 1. สร้าง auction ใหม่
    // POST /api/auctions
    // =====================================================
    @PostMapping
    public ResponseEntity<AuctionResponse> createAuction(
            @Valid @RequestBody CreateAuctionRequest request) {

        String username = getCurrentUsername();
        AuctionResponse response = auctionService.createAuction(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // 2. ดู auction ทั้งหมด (pagination + filter by status)
    // GET /api/auctions?status=ACTIVE&page=0&size=20
    // =====================================================
    @GetMapping
    public Page<AuctionSummaryResponse> listAuctions(
            @RequestParam(required = false) AuctionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return auctionService.listAuctions(status, page, size);
    }

    // =====================================================
    // 3. ดู auction ของตัวเอง
    // GET /api/auctions/my
    // =====================================================
    @GetMapping("/my")
    public Page<AuctionSummaryResponse> getMyAuctions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String username = getCurrentUsername();
        return auctionService.getMyAuctions(username, page, size);
    }

    // =====================================================
    // 4. ดูรายละเอียด auction
    // GET /api/auctions/{id}
    // =====================================================
    @GetMapping("/{id}")
    public AuctionResponse getAuction(@PathVariable Long id) {
        return auctionService.getAuction(id);
    }

    // =====================================================
    // 5. แก้ไข auction (เฉพาะเจ้าของ + DRAFT)
    // PUT /api/auctions/{id}
    // =====================================================
    @PutMapping("/{id}")
    public AuctionResponse updateAuction(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAuctionRequest request) {

        String username = getCurrentUsername();
        return auctionService.updateAuction(id, request, username);
    }

    // =====================================================
    // 6. ยกเลิก auction (เฉพาะเจ้าของ + DRAFT)
    // DELETE /api/auctions/{id}
    // =====================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelAuction(@PathVariable Long id) {
        String username = getCurrentUsername();
        auctionService.cancelAuction(id, username);
        return ResponseEntity.noContent().build();   // 204
    }

    // =====================================================
    // Helper: ดึง username จาก SecurityContext
    // =====================================================
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

/*TODO
// แบบสั้น ๆ ในอนาคต
public AuctionResponse createAuction(
        @Valid @RequestBody CreateAuctionRequest request,
        @AuthenticationPrincipal User currentUser) { ... }
*/