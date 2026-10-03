package com.bidflow.backend.repository;

import com.bidflow.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    List<Category> findByActiveTrue();

    boolean existsBySlug(String slug);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query("select count(a) from AuctionItem a where a.category.id = :categoryId")
    long countAuctions(@Param("categoryId") Long categoryId);

    // จำนวน auction ต่อหมวด (ทุก status) — หมวดที่ไม่มี auction จะไม่อยู่ในผลลัพธ์
    @Query("select a.category.id as categoryId, count(a) as auctionCount from AuctionItem a group by a.category.id")
    List<CategoryUsage> countAuctionsPerCategory();

    interface CategoryUsage {
        Long getCategoryId();
        long getAuctionCount();
    }
}
