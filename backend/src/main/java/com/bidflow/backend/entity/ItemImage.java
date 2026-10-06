package com.bidflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "item_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // เชื่อมกับสินค้าประมูล (FK -> auction_items.id)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_item_id", nullable = false)
    private AuctionItem auctionItem;

    // AWS S3 Object Key ( Path อ้างอิงรูปภาพใน S3 Bucket )
    @Column(name = "object_key", nullable = false, length = 500)
    private String objectKey;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private boolean isPrimary = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

}