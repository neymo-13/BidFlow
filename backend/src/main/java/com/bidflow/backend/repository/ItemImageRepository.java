package com.bidflow.backend.repository;

import com.bidflow.backend.entity.ItemImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ItemImageRepository extends JpaRepository<ItemImage, Long> {

    // รูปของ auction ตามลำดับการแสดง
    List<ItemImage> findByAuctionItemIdOrderByDisplayOrderAscIdAsc(Long auctionItemId);

    // รูปที่ต้องเป็นของ auction นี้เท่านั้น (กันการลบรูปของ auction อื่นผ่าน URL)
    Optional<ItemImage> findByIdAndAuctionItemId(Long id, Long auctionItemId);

    // รูปหลักของหลาย auction ใน query เดียว (หน้า list ไม่เกิด N+1)
    @Query("select i from ItemImage i where i.auctionItem.id in :auctionIds and i.isPrimary = true")
    List<ItemImage> findPrimaryByAuctionItemIds(@Param("auctionIds") Collection<Long> auctionIds);
}
