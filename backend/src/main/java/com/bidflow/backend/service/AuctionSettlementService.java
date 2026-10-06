package com.bidflow.backend.service;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.repository.AuctionItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuctionSettlementService {

    private final AuctionItemRepository auctionItemRepository;
    private final AuctionSettlementExecutor settlementExecutor;

    // รันทุก 30 วิ
    @Scheduled(fixedDelay = 30_000, initialDelay = 10_000)
    public void closeExpiredAuctions() {
        log.info("Scheduler: checking for expired auctions...");

        List<AuctionItem> expired = auctionItemRepository
                .findByStatusAndEndTimeBefore(AuctionStatus.ACTIVE, OffsetDateTime.now());

        if (expired.isEmpty()) {
            log.info("Scheduler: no expired auctions");
            return;
        }

        log.info("Scheduler: found {} expired auctions", expired.size());

        for (AuctionItem auction : expired) {
            try {
                settlementExecutor.settleAuction(auction.getId());
            } catch (Exception e) {
                log.error("Scheduler: failed to settle auction {}", auction.getId(), e);
                // ทำต่อ — auction อื่นไม่ควรถูก block
            }
        }
    }

}
