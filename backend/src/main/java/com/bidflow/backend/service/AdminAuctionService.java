package com.bidflow.backend.service;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.Bid;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.exception.AuctionNotFoundException;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.BidRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuctionService {

    private static final Set<AuctionStatus> CANCELLABLE = EnumSet.of(AuctionStatus.DRAFT, AuctionStatus.ACTIVE);

    private final RedissonClient redissonClient;
    private final TransactionTemplate transactionTemplate;
    private final AuctionItemRepository auctionItemRepository;
    private final BidRepository bidRepository;
    private final WalletService walletService;
    private final NotificationService notificationService;

    // =====================================================
    // Admin ยกเลิก auction (DRAFT / ACTIVE) พร้อมเหตุผล
    // - ใช้ lock เดียวกับ BidService.placeBid ("auction:bid:{id}") → ไม่มีบิดแทรกระหว่างยกเลิก
    // - ชนกับ scheduler ที่กำลังปิด auction → @Version ของ AuctionItem กันไว้ → rollback ทั้งหมด + 409
    // - commit ก่อนปลด lock (TransactionTemplate) เหมือนการบิด
    // =====================================================
    public void cancelAuction(Long auctionId, String reason, String adminUsername) {
        String trimmedReason = reason.trim();

        RLock lock = redissonClient.getLock("auction:bid:" + auctionId);
        boolean acquired;
        try {
            acquired = lock.tryLock(3, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Interrupted while waiting for the auction lock");
        }
        if (!acquired) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Auction is busy processing a bid. Please try again.");
        }

        try {
            transactionTemplate.executeWithoutResult(status -> cancelInternal(auctionId, trimmedReason, adminUsername));
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Auction changed while cancelling (it may have just ended). Reload and try again.");
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    // ทำงานภายใน lock + transaction เดียว — ผิดพลาดตรงไหนย้อนกลับทั้งหมด (สถานะ, เงิน, แจ้งเตือน)
    private void cancelInternal(Long auctionId, String reason, String adminUsername) {
        AuctionItem auction = auctionItemRepository.findById(auctionId)
                .orElseThrow(() -> new AuctionNotFoundException(auctionId));

        AuctionStatus previousStatus = auction.getStatus();
        if (!CANCELLABLE.contains(previousStatus)) {
            throw new IllegalArgumentException(
                    "Only DRAFT or ACTIVE auctions can be cancelled. Current status: " + previousStatus);
        }

        // 1) คืนเงินที่กันไว้ของผู้นำ (ระบบกันเงินเฉพาะบิดสูงสุด — คนที่โดนแซงได้คืนไปแล้วตอนโดนแซง)
        Bid highest = bidRepository.findFirstByAuctionItemIdOrderByBidAmountDesc(auctionId).orElse(null);
        if (highest != null) {
            walletService.release(highest.getBidder(), highest.getBidAmount(), auctionId,
                    "Refund: auction " + auctionId + " cancelled by admin");
        }

        // 2) เปลี่ยนสถานะ — flush ทันทีเพื่อตรวจ @Version ก่อนสร้างแจ้งเตือน
        auction.setStatus(AuctionStatus.CANCELLED);
        auctionItemRepository.saveAndFlush(auction);

        // 3) แจ้งเตือนผู้ขาย + ทุกคนที่เคยบิด (ผู้ขายบิดของตัวเองไม่ได้ จึงไม่ซ้ำกัน)
        String title = auction.getTitle();
        notificationService.create(auction.getSeller(), auction,
                "Your auction was cancelled by an admin",
                "'" + title + "' was cancelled. Reason: " + reason);

        for (User bidder : bidRepository.findDistinctBiddersByAuctionId(auctionId)) {
            boolean leader = highest != null && bidder.getId().equals(highest.getBidder().getId());
            String refund = leader
                    ? " Your held bid of " + highest.getBidAmount().toPlainString() + " has been returned to your wallet."
                    : "";
            notificationService.create(bidder, auction,
                    "An auction you bid on was cancelled",
                    "'" + title + "' was cancelled by an admin. Reason: " + reason + refund);
        }

        log.info("Admin '{}' cancelled auction {} (was {}){}", adminUsername, auctionId, previousStatus,
                highest != null
                        ? " — refunded " + highest.getBidAmount().toPlainString() + " to '" + highest.getBidder().getUsername() + "'"
                        : "");
    }
}
