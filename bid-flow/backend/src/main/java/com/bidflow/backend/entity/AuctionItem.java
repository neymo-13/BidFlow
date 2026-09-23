package com.bidflow.backend.entity;

import com.bidflow.backend.enums.AuctionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "auction_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuctionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ผู้ขายสินค้า (FK -> users.id)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    // ผู้ชนะการประมูล (FK -> users.id) - จะเป็น null จนกว่าจะจบการประมูล
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal startPrice;

    @Column(name = "min_increment", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal minIncrement = new BigDecimal("1.00");

    @Column(name = "current_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal currentPrice;

	@Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private AuctionStatus status = AuctionStatus.DRAFT; // 'DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'

    @Column(name = "start_time", nullable = false)
    private OffsetDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private OffsetDateTime endTime;

    @Column(name = "total_bids", nullable = false)
    @Builder.Default
    private Integer totalBids = 0;

    // Optimistic Locking สำหรับป้องกัน Race Condition / Concurrent Updates ในระดับ JPA
    @Version
    @Column(name = "version")
    private Long version;

    @CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;
}