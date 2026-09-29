package com.bidflow.backend.controller;

import com.bidflow.backend.dto.AuctionImageResponse;
import com.bidflow.backend.dto.AuctionResponse;
import com.bidflow.backend.dto.AuctionSummaryResponse;
import com.bidflow.backend.dto.CreateAuctionRequest;
import com.bidflow.backend.dto.UpdateAuctionRequest;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.service.AuctionImageService;
import com.bidflow.backend.service.AuctionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auctions")
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;
    private final AuctionImageService auctionImageService;

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
    // 2. ดู auction ทั้งหมด (pagination + filter by status + ค้นหา + เรียง)
    // GET /api/auctions?status=ACTIVE&q=leica&sort=priceAsc&page=0&size=20
    // sort: newest (default) | endingSoon | priceAsc | priceDesc | mostBids · size สูงสุด 50
    // =====================================================
    @GetMapping
    public Page<AuctionSummaryResponse> listAuctions(
            @RequestParam(required = false) AuctionStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return auctionService.listAuctions(status, q, sort, page, size);
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
        return auctionService.getAuction(id, getOptionalUsername());
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
    // 7. Publish auction (เฉพาะเจ้าของ + DRAFT) → ACTIVE
    // POST /api/auctions/{id}/publish
    // =====================================================
    @PostMapping("/{id}/publish")
    public AuctionResponse publishAuction(@PathVariable Long id) {
        String username = getCurrentUsername();
        return auctionService.publishAuction(id, username);
    }

    // =====================================================
    // 8. อัปโหลดรูป (เฉพาะเจ้าของ + DRAFT) — multipart field "file"
    // POST /api/auctions/{id}/images · JPEG/PNG/WebP ≤ 5 MB · สูงสุด 5 รูป
    // =====================================================
    @PostMapping("/{id}/images")
    public ResponseEntity<AuctionImageResponse> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        String username = getCurrentUsername();
        AuctionImageResponse response = auctionImageService.upload(id, file, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // 9. ลบรูป (เฉพาะเจ้าของ + DRAFT)
    // DELETE /api/auctions/{id}/images/{imageId}
    // =====================================================
    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<Void> deleteImage(@PathVariable Long id, @PathVariable Long imageId) {
        String username = getCurrentUsername();
        auctionImageService.delete(id, imageId, username);
        return ResponseEntity.noContent().build();   // 204
    }

    // =====================================================
    // Helper: ดึง username จาก SecurityContext
    // =====================================================
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }

    // =====================================================
    // Helper: username ของคนที่ล็อกอิน หรือ null ถ้าเป็น guest
    // (ใช้กับ endpoint สาธารณะที่ผลลัพธ์ขึ้นกับว่าเป็นเจ้าของหรือไม่)
    // =====================================================
    private String getOptionalUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return auth.getName();
    }
}

/*TODO
// แบบสั้น ๆ ในอนาคต
public AuctionResponse createAuction(
        @Valid @RequestBody CreateAuctionRequest request,
        @AuthenticationPrincipal User currentUser) { ... }
*/