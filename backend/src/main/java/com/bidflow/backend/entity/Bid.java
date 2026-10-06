package com.bidflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(
    name = "bids",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "unique_item_bid_sequence",
            columnNames = {"auction_item_id", "bid_sequence"}
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // สินค้าประมูลที่ถูกเสนอราคา (FK -> auction_items.id)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_item_id", nullable = false)
    private AuctionItem auctionItem;

    // ผู้เสนอราคา (FK -> users.id)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bidder_id", nullable = false)
    private User bidder;

    @Column(name = "bid_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal bidAmount;

    // ลำดับการประมูลของสินค้าชิ้นนั้น (1, 2, 3, ...) สำหรับป้องกันการเสนอราคาซ้ำซ้อน
    @Column(name = "bid_sequence", nullable = false)
    private Long bidSequence;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;
}