package com.bidflow.backend.repository;

import com.bidflow.backend.entity.Bid;
import com.bidflow.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {

    // ดูประวัติ bid ของ auction (ใหม่สุดก่อน)
    Page<Bid> findByAuctionItemIdOrderByCreatedAtDesc(Long auctionItemId, Pageable pageable);

    // หา bid ล่าสุดของ auction (highest)
    Optional<Bid> findFirstByAuctionItemIdOrderByBidAmountDesc(Long auctionItemId);

    // คนที่เคยบิด auction นี้ (ไม่ซ้ำ) — ใช้แจ้งเตือนตอน admin ยกเลิก
    @Query("select distinct b.bidder from Bid b where b.auctionItem.id = :auctionId")
    List<User> findDistinctBiddersByAuctionId(@Param("auctionId") Long auctionId);

    // นับ bid ทั้งหมด
    long countByAuctionItemId(Long auctionItemId);

    // My Bids: 1 แถวต่อ auction ที่ bidder เคยบิด (บิดล่าสุดก่อน)
    @Query(value = """
            select b.auctionItem.id as auctionId,
                   max(b.bidAmount) as myHighestBid,
                   count(b) as myBidCount,
                   max(b.createdAt) as lastBidAt
            from Bid b
            where b.bidder.id = :bidderId
            group by b.auctionItem.id
            order by max(b.createdAt) desc, b.auctionItem.id desc
            """,
            countQuery = """
            select count(distinct b.auctionItem.id)
            from Bid b
            where b.bidder.id = :bidderId
            """)
    Page<MyBidAggregate> findMyBidAggregates(@Param("bidderId") Long bidderId, Pageable pageable);

    interface MyBidAggregate {
        Long getAuctionId();
        BigDecimal getMyHighestBid();
        Long getMyBidCount();
        OffsetDateTime getLastBidAt();
    }
}
