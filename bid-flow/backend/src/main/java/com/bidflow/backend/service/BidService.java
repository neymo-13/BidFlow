package com.bidflow.backend.service;

import com.bidflow.backend.dto.BidResponse;
import com.bidflow.backend.dto.BidSummaryResponse;
import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.Bid;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.exception.UserNotFoundException;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.BidRepository;
import com.bidflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class BidService {

    private final RedissonClient redissonClient;
    private final AuctionItemRepository auctionItemRepository;
    private final BidRepository bidRepository;
    private final UserRepository userRepository;
    private final WalletService walletService;
    private final TransactionTemplate transactionTemplate; // ใช้ programmatic transaction เพื่อให้ commit ก่อนปลด lock

    // =====================================================
    // Place Bid
    // =====================================================
    public BidResponse placeBid(Long auctionId, BigDecimal amount, String username) {

        // 1. Acquire distributed lock
        String lockKey = "auction:bid:" + auctionId;
        RLock lock = redissonClient.getLock(lockKey);

        boolean acquired;
        try {
            acquired = lock.tryLock(3, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for lock");
        }

        if (!acquired) {
            throw new IllegalStateException(
                    "Auction is busy processing another bid. Please try again."
            );
        }

        try {
            // 2. ครอบ Transaction ผ่าน TransactionTemplate เพื่อมั่นใจว่า DB Commit ก่อนปลด Lock
            return transactionTemplate.execute(status -> processBidInternal(auctionId, amount, username));
        } finally {
            // 3. Unlock เสมอหลังจาก DB Transaction commit เสร็จสิ้นแล้ว
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    // =====================================================
    // Internal Business logic (อยู่ภายใน Lock & Transaction)
    // =====================================================
    private BidResponse processBidInternal(Long auctionId, BigDecimal amount, String username) {

        // 1) โหลด auction
        AuctionItem auction = auctionItemRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found: " + auctionId));

        // 2) เช็ค status = ACTIVE
        if (auction.getStatus() != AuctionStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Auction is not active. Current status: " + auction.getStatus()
            );
        }

        // 3) เช็คเวลา
        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(auction.getStartTime())) {
            throw new IllegalArgumentException("Auction has not started yet");
        }
        if (now.isAfter(auction.getEndTime())) {
            throw new IllegalArgumentException("Auction has ended");
        }

        // 4) โหลด bidder
        User bidder = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        // 5) ห้าม seller bid ของตัวเอง
        if (auction.getSeller().getId().equals(bidder.getId())) {
            throw new IllegalArgumentException("You cannot bid on your own auction");
        }

        // 6) เช็คราคา: amount >= current_price + min_increment
        BigDecimal minRequired = auction.getCurrentPrice().add(auction.getMinIncrement());
        if (amount.compareTo(minRequired) < 0) {
            throw new IllegalArgumentException(String.format(
                    "Bid must be at least %s (current: %s + increment: %s)",
                    minRequired, auction.getCurrentPrice(), auction.getMinIncrement()
            ));
        }

        // 7) หา bid ล่าสุด
        Bid previousHighest = bidRepository
                .findFirstByAuctionItemIdOrderByBidAmountDesc(auctionId)
                .orElse(null);

        // (ป้องกันบิดเดอร์คนเดิมบิดซ้ำราคาเดิม)
        if (previousHighest != null && previousHighest.getBidder().getId().equals(bidder.getId())) {
            log.info("Same bidder raising bid for auction: {}", auctionId);
        }

		// 8) Release เงิน bidder เก่าออกก่อน (เพื่อคืน Effective Balance)
		if (previousHighest != null) {
			walletService.release(
					previousHighest.getBidder(),
					previousHighest.getBidAmount(),
					auctionId
			);
		}

		// 9) Hold เงิน bidder ใหม่ (ถ้าเงินไม่พอ Transaction จะ Rollback คำสั่ง Release ด้านบนกลับมาให้อัตโนมัติ)
		walletService.hold(bidder, amount, auctionId);

        // 10) สร้าง sequence ถัดไป
        long nextSequence = auction.getTotalBids() + 1;

        Bid bid = Bid.builder()
                .auctionItem(auction)
                .bidder(bidder)
                .bidAmount(amount)
                .bidSequence(nextSequence)
                .build();
        bidRepository.save(bid);

        // 11) Update auction
        auction.setCurrentPrice(amount);
        auction.setTotalBids(auction.getTotalBids() + 1);
        auctionItemRepository.save(auction);

        log.info("Bid placed: auction={}, bidder={}, amount={}, seq={}",
                auctionId, username, amount, nextSequence);

        return toResponse(bid);
    }

    // =====================================================
    // ดูประวัติ bid ของ auction
    // =====================================================
    @Transactional(readOnly = true)
    public Page<BidSummaryResponse> getAuctionBids(Long auctionId, int page, int size) {
        if (!auctionItemRepository.existsById(auctionId)) {
            throw new IllegalArgumentException("Auction not found: " + auctionId);
        }
        Pageable pageable = PageRequest.of(page, size);
        return bidRepository
                .findByAuctionItemIdOrderByCreatedAtDesc(auctionId, pageable)
                .map(this::toSummary);
    }

    // =====================================================
    // Helper
    // =====================================================
    private BidResponse toResponse(Bid bid) {
        return new BidResponse(
                bid.getId(),
                bid.getAuctionItem().getId(),
                bid.getBidder().getId(),
                bid.getBidder().getUsername(),
                bid.getBidAmount(),
                bid.getBidSequence(),
                bid.getCreatedAt()
        );
    }

    private BidSummaryResponse toSummary(Bid bid) {
        return new BidSummaryResponse(
                bid.getId(),
                bid.getBidder().getUsername(),
                bid.getBidAmount(),
                bid.getBidSequence(),
                bid.getCreatedAt()
        );
    }
}