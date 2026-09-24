package com.bidflow.backend.service;

import com.bidflow.backend.dto.AuctionResponse;
import com.bidflow.backend.dto.AuctionSummaryResponse;
import com.bidflow.backend.dto.CreateAuctionRequest;
import com.bidflow.backend.dto.UpdateAuctionRequest;
import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.exception.UserNotFoundException;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuctionService {

    private final AuctionItemRepository auctionItemRepository;
    private final UserRepository userRepository;

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

        // 3) สร้าง auction
        AuctionItem auction = AuctionItem.builder()
                .seller(seller)
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
    // =====================================================
    @Transactional(readOnly = true)
    public AuctionResponse getAuction(Long auctionId) {
        AuctionItem auction = findAuction(auctionId);
        return toResponse(auction);
    }

    // =====================================================
    // 3. ดู list auctions (pagination + filter)
    // =====================================================
    @Transactional(readOnly = true)
    public Page<AuctionSummaryResponse> listAuctions(
            AuctionStatus status,
            int page,
            int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<AuctionItem> auctions;
        if (status != null) {
            auctions = auctionItemRepository.findByStatus(status, pageable);
        } else {
            auctions = auctionItemRepository.findAll(pageable);
        }

        return auctions.map(this::toSummary);
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
        return auctionItemRepository.findBySellerId(seller.getId(), pageable)
                .map(this::toSummary);
    }

    // =====================================================
    // Helper methods
    // =====================================================

    private AuctionItem findAuction(Long auctionId) {
        return auctionItemRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found: " + auctionId));
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
                a.getUpdatedAt()
        );
    }

    private AuctionSummaryResponse toSummary(AuctionItem a) {
        return new AuctionSummaryResponse(
                a.getId(),
                a.getTitle(),
                a.getCurrentPrice(),
                a.getStatus(),
                a.getEndTime(),
                a.getTotalBids(),
                a.getSeller().getUsername()
        );
    }
}