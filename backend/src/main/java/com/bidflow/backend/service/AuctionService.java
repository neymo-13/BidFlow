package com.bidflow.backend.service;

import com.bidflow.backend.dto.AuctionResponse;
import com.bidflow.backend.dto.AuctionSummaryResponse;
import com.bidflow.backend.dto.CategoryResponse;
import com.bidflow.backend.dto.CreateAuctionRequest;
import com.bidflow.backend.dto.UpdateAuctionRequest;
import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.Category;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.exception.AuctionNotFoundException;
import com.bidflow.backend.exception.UserNotFoundException;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.AuctionSpecifications;
import com.bidflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuctionService {

    // สถานะที่คนทั่วไปเห็นได้ (FR-13)
    private static final Set<AuctionStatus> PUBLIC_STATUSES =
            EnumSet.of(AuctionStatus.ACTIVE, AuctionStatus.ENDED);

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_KEYWORD_LENGTH = 100;

    // ค่า sort ที่รับได้ (whitelist) — ต่อท้ายด้วย id เพื่อให้ลำดับคงที่ข้ามหน้า
    private static final Map<String, Sort> SORTS = Map.of(
            "newest", Sort.by(Sort.Direction.DESC, "createdAt", "id"),
            "endingSoon", Sort.by(Sort.Order.asc("endTime"), Sort.Order.desc("id")),
            "priceAsc", Sort.by(Sort.Order.asc("currentPrice"), Sort.Order.desc("id")),
            "priceDesc", Sort.by(Sort.Direction.DESC, "currentPrice", "id"),
            "mostBids", Sort.by(Sort.Direction.DESC, "totalBids", "id")
    );
    private static final String DEFAULT_SORT = "newest";

    private final AuctionItemRepository auctionItemRepository;
    private final UserRepository userRepository;
    private final AuctionImageService auctionImageService;
    private final CategoryService categoryService;

    // =====================================================
    // 1. สร้าง auction ใหม่
    // =====================================================
    @Transactional
    public AuctionResponse createAuction(CreateAuctionRequest request, String sellerUsername) {

        // 1) โหลด seller
        User seller = userRepository.findByUsername(sellerUsername)
                .orElseThrow(() -> new UserNotFoundException(sellerUsername));

        // 2) Validate: endTime > startTime
        if (!request.endTime().isAfter(request.startTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        // 2.1) หมวดต้องมีจริงและไม่ถูกซ่อน
        Category category = categoryService.getSelectableCategory(request.categoryId());

        // 3) สร้าง auction
        AuctionItem auction = AuctionItem.builder()
                .seller(seller)
                .category(category)
                .title(request.title())
                .description(request.description())
                .startPrice(request.startPrice())
                .minIncrement(request.minIncrement())
                .currentPrice(request.startPrice())   // เริ่มต้น = startPrice
                .status(AuctionStatus.DRAFT)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .totalBids(0)
                .build();

        // 4) Save
        AuctionItem saved = auctionItemRepository.save(auction);

        // 5) Return
        return toResponse(saved);
    }

    // =====================================================
    // 2. ดูรายละเอียด auction
    //    DRAFT / CANCELLED เห็นได้เฉพาะเจ้าของ คนอื่นได้ 404 (ไม่บอกว่ามีอยู่)
    // =====================================================
    @Transactional(readOnly = true)
    public AuctionResponse getAuction(Long auctionId, String currentUsername) {
        AuctionItem auction = auctionItemRepository.findById(auctionId)
                .filter(a -> PUBLIC_STATUSES.contains(a.getStatus())
                        || a.getSeller().getUsername().equals(currentUsername))
                .orElseThrow(() -> new AuctionNotFoundException(auctionId));
        return toResponse(auction);
    }

    // =====================================================
    // 3. ดู list auctions (pagination + filter + ค้นหา + เรียง)
    //    แสดงเฉพาะ ACTIVE / ENDED — ไม่ส่ง status = ทั้งสองสถานะ
    //    category = slug ของหมวดที่แสดงอยู่ (ไม่ส่ง = ทุกหมวด)
    // =====================================================
    @Transactional(readOnly = true)
    public Page<AuctionSummaryResponse> listAuctions(
            AuctionStatus status,
            String keyword,
            String category,
            String sort,
            int page,
            int size) {

        if (status != null && !PUBLIC_STATUSES.contains(status)) {
            throw new IllegalArgumentException("status must be one of " + PUBLIC_STATUSES);
        }

        Set<AuctionStatus> statuses = status != null ? EnumSet.of(status) : PUBLIC_STATUSES;
        Long categoryId = categoryService.resolveFilterSlug(category);
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE), resolveSort(sort));

        return toSummaryPage(auctionItemRepository.findAll(
                AuctionSpecifications.search(statuses, normalizeKeyword(keyword), categoryId), pageable));
    }

    // =====================================================
    // 4. แก้ไข auction (เฉพาะเจ้าของ + DRAFT)
    // =====================================================
    @Transactional
    public AuctionResponse updateAuction(
            Long auctionId,
            UpdateAuctionRequest request,
            String currentUsername) {

        AuctionItem auction = findAuction(auctionId);

        // 1) Ownership check
        ensureOwner(auction, currentUsername);

        // 2) Status check
        if (auction.getStatus() != AuctionStatus.DRAFT) {
            throw new IllegalArgumentException(
                    "Cannot update auction in status: " + auction.getStatus()
                            + ". Only DRAFT can be modified."
            );
        }

        // 3) Update fields ที่ส่งมา (partial update)
        if (request.title() != null) {
            auction.setTitle(request.title());
        }
        if (request.description() != null) {
            auction.setDescription(request.description());
        }
        if (request.startPrice() != null) {
            auction.setStartPrice(request.startPrice());
            auction.setCurrentPrice(request.startPrice());   // sync
        }
        if (request.minIncrement() != null) {
            auction.setMinIncrement(request.minIncrement());
        }
        if (request.startTime() != null) {
            auction.setStartTime(request.startTime());
        }
        if (request.endTime() != null) {
            auction.setEndTime(request.endTime());
        }
        // ส่งหมวดเดิมมา (แม้ถูกซ่อนไปแล้ว) = ไม่เปลี่ยน · หมวดใหม่ต้องเลือกได้
        if (request.categoryId() != null
                && !request.categoryId().equals(auction.getCategory().getId())) {
            auction.setCategory(categoryService.getSelectableCategory(request.categoryId()));
        }

        // 4) Validate: endTime > startTime หลัง update
        if (!auction.getEndTime().isAfter(auction.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        return toResponse(auction);
    }

    // =====================================================
    // 5. ยกเลิก auction (เฉพาะเจ้าของ + DRAFT)
    // =====================================================
    @Transactional
    public void cancelAuction(Long auctionId, String currentUsername) {
        AuctionItem auction = findAuction(auctionId);

        ensureOwner(auction, currentUsername);

        if (auction.getStatus() != AuctionStatus.DRAFT) {
            throw new IllegalArgumentException(
                    "Cannot cancel auction in status: " + auction.getStatus()
                            + ". Only DRAFT can be cancelled."
            );
        }

        auction.setStatus(AuctionStatus.CANCELLED);
    }

    // =====================================================
    // 5.1 Publish auction (เฉพาะเจ้าของ + DRAFT + endTime ยังไม่ผ่าน)
    //     ถ้า startTime ผ่านแล้วจะเปิดประมูลทันที · ยังไม่ถึงก็บิดไม่ได้จนกว่าจะถึง (BidService)
    // =====================================================
    @Transactional
    public AuctionResponse publishAuction(Long auctionId, String currentUsername) {
        AuctionItem auction = findAuction(auctionId);

        ensureOwner(auction, currentUsername);

        if (auction.getStatus() != AuctionStatus.DRAFT) {
            throw new IllegalArgumentException(
                    "Cannot publish auction in status: " + auction.getStatus()
                            + ". Only DRAFT can be published."
            );
        }

        if (!auction.getEndTime().isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException(
                    "Cannot publish: end time has already passed. Update the end time first."
            );
        }

        auction.setStatus(AuctionStatus.ACTIVE);
        return toResponse(auction);
    }

    // =====================================================
    // 6. ดู auction ของตัวเอง
    // =====================================================
    @Transactional(readOnly = true)
    public Page<AuctionSummaryResponse> getMyAuctions(
            String currentUsername,
            int page,
            int size) {

        User seller = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UserNotFoundException(currentUsername));

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return toSummaryPage(auctionItemRepository.findBySellerId(seller.getId(), pageable));
    }

    // =====================================================
    // 7. Admin: auction ทุก status (รวม DRAFT / CANCELLED ของทุกคน) — ใหม่สุดก่อน
    //    สิทธิ์ ADMIN ตรวจที่ SecurityConfig (/api/admin/**)
    // =====================================================
    @Transactional(readOnly = true)
    public Page<AuctionSummaryResponse> listForAdmin(
            AuctionStatus status,
            String keyword,
            int page,
            int size) {

        Set<AuctionStatus> statuses = status != null ? EnumSet.of(status) : EnumSet.allOf(AuctionStatus.class);
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE), SORTS.get(DEFAULT_SORT));

        return toSummaryPage(auctionItemRepository.findAll(
                AuctionSpecifications.search(statuses, normalizeKeyword(keyword), null), pageable));
    }

    // =====================================================
    // Helper methods
    // =====================================================

    private AuctionItem findAuction(Long auctionId) {
        return auctionItemRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found: " + auctionId));
    }

    private Sort resolveSort(String sort) {
        Sort resolved = SORTS.get(sort == null || sort.isBlank() ? DEFAULT_SORT : sort);
        if (resolved == null) {
            throw new IllegalArgumentException("sort must be one of " + SORTS.keySet());
        }
        return resolved;
    }

    // ตัดช่องว่าง · ว่าง = ไม่ค้นหา · ยาวเกินกำหนด = 400
    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String trimmed = keyword.trim();
        if (trimmed.length() > MAX_KEYWORD_LENGTH) {
            throw new IllegalArgumentException(
                    "q must be at most " + MAX_KEYWORD_LENGTH + " characters");
        }
        return trimmed;
    }

    private void ensureOwner(AuctionItem auction, String currentUsername) {
        if (!auction.getSeller().getUsername().equals(currentUsername)) {
            throw new AccessDeniedException("You are not the owner of this auction");
        }
    }

    private AuctionResponse toResponse(AuctionItem a) {
        return new AuctionResponse(
                a.getId(),
                a.getSeller().getId(),
                a.getSeller().getUsername(),
                a.getWinner() != null ? a.getWinner().getId() : null,
                a.getWinner() != null ? a.getWinner().getUsername() : null,
                a.getTitle(),
                a.getDescription(),
                a.getStartPrice(),
                a.getMinIncrement(),
                a.getCurrentPrice(),
                a.getStatus(),
                a.getStartTime(),
                a.getEndTime(),
                a.getTotalBids(),
                a.getCreatedAt(),
                a.getUpdatedAt(),
                auctionImageService.getImages(a.getId()),
                categoryService.toResponse(a.getCategory())
        );
    }

    // ดึง URL รูปหลักและหมวดของทั้งหน้าอย่างละ query เดียว แล้วค่อยแปลงแต่ละแถว
    // (getCategory().getId() อ่าน id จาก proxy ได้โดยไม่ query เพิ่ม)
    private Page<AuctionSummaryResponse> toSummaryPage(Page<AuctionItem> auctions) {
        Map<Long, String> imageUrls = auctionImageService.getPrimaryImageUrls(
                auctions.map(AuctionItem::getId).getContent());
        Map<Long, CategoryResponse> categories = categoryService.getResponsesByIds(
                auctions.stream().map(a -> a.getCategory().getId()).collect(Collectors.toSet()));
        return auctions.map(a -> toSummary(
                a, imageUrls.get(a.getId()), categories.get(a.getCategory().getId())));
    }

    private AuctionSummaryResponse toSummary(
            AuctionItem a, String primaryImageUrl, CategoryResponse category) {
        return new AuctionSummaryResponse(
                a.getId(),
                a.getTitle(),
                a.getCurrentPrice(),
                a.getStatus(),
                a.getStartTime(),
                a.getEndTime(),
                a.getTotalBids(),
                a.getSeller().getUsername(),
                primaryImageUrl,
                category
        );
    }
}