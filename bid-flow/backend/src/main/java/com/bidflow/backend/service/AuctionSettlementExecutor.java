package com.bidflow.backend.service;

import com.bidflow.backend.dto.BidEvent;
import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.Bid;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.BidRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuctionSettlementExecutor {

    private final AuctionItemRepository auctionItemRepository;
    private final BidRepository bidRepository;
    private final WalletService walletService;
    private final NotificationService notificationService;
    private final BidEventPublisher bidEventPublisher;

    @Transactional
    public void settleAuction(Long auctionId) {
        AuctionItem auction = auctionItemRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found"));

        // Idempotency
        if (auction.getStatus() != AuctionStatus.ACTIVE) {
            log.warn("Scheduler: auction {} not ACTIVE (status={}), skipping",
                    auctionId, auction.getStatus());
            return;
        }

        Bid highestBid = bidRepository
                .findFirstByAuctionItemIdOrderByBidAmountDesc(auctionId)
                .orElse(null);

        if (highestBid == null) {
            auction.setStatus(AuctionStatus.ENDED);
            auctionItemRepository.save(auction);
            log.info("Scheduler: auction {} ended — no bids", auctionId);

            notificationService.create(
                    auction.getSeller(), auction,
                    "Your auction ended without bids",
                    "No one bid on '" + auction.getTitle() + "'"
            );
            return;
        }

        User winner = highestBid.getBidder();
        User seller = auction.getSeller();

        // 1) ตั้ง winner + status
        auction.setWinner(winner);
        auction.setStatus(AuctionStatus.ENDED);
        auctionItemRepository.save(auction);

        // 2) โอนเงิน
        walletService.settleToSeller(winner, seller, highestBid.getBidAmount(), auctionId);

        // 3) Notifications
        notificationService.create(
                winner, auction,
                "You won the auction!",
                "You won '" + auction.getTitle() + "' for " + highestBid.getBidAmount()
        );
        notificationService.create(
                seller, auction,
                "Your auction has been sold",
                "Your item '" + auction.getTitle() + "' sold for " + highestBid.getBidAmount()
        );

        // 4) Broadcast
        bidEventPublisher.publishAuctionEnded(new BidEvent(
                "AUCTION_ENDED",
                auction.getId(),
                highestBid.getId(),
                winner.getId(),
                winner.getUsername(),
                highestBid.getBidAmount(),
                highestBid.getBidSequence(),
                auction.getCurrentPrice(),
                OffsetDateTime.now()
        ));

        log.info("Scheduler: auction {} settled — winner={}, amount={}",
                auctionId, winner.getUsername(), highestBid.getBidAmount());
    }
}
