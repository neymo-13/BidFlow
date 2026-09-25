package com.bidflow.backend.repository;

import com.bidflow.backend.entity.Bid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {

    // ดูประวัติ bid ของ auction (ใหม่สุดก่อน)
    Page<Bid> findByAuctionItemIdOrderByCreatedAtDesc(Long auctionItemId, Pageable pageable);

    // หา bid ล่าสุดของ auction (highest)
    Optional<Bid> findFirstByAuctionItemIdOrderByBidAmountDesc(Long auctionItemId);

    // นับ bid ทั้งหมด
    long countByAuctionItemId(Long auctionItemId);
}
