package com.bidflow.backend.repository;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.enums.AuctionStatus;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuctionItemRepository extends JpaRepository<AuctionItem, Long> {

    Page<AuctionItem> findByStatus(AuctionStatus status, Pageable pageable);

    Page<AuctionItem> findBySellerId(Long sellerId, Pageable pageable);

	List<AuctionItem> findByStatusAndEndTimeBefore(AuctionStatus status, OffsetDateTime time);

}