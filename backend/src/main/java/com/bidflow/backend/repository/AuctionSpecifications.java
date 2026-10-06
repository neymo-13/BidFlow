package com.bidflow.backend.repository;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.enums.AuctionStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

// เงื่อนไขค้นหา auction (Criteria API → parameterized query ทั้งหมด ไม่ต่อ string เป็น SQL)
public final class AuctionSpecifications {

    private static final char LIKE_ESCAPE = '\\';

    private AuctionSpecifications() {
    }

    // status อยู่ใน statuses และ (ถ้ามี keyword) title หรือ description มี keyword แบบไม่สนตัวพิมพ์
    // และ (ถ้ามี categoryId) อยู่ในหมวดนั้น
    public static Specification<AuctionItem> search(
            Collection<AuctionStatus> statuses, String keyword, Long categoryId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(root.get("status").in(statuses));

            if (categoryId != null) {
                // เทียบกับ FK category_id โดยตรง ไม่ต้อง join ตาราง categories
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            if (keyword != null) {
                String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("description")), pattern, LIKE_ESCAPE)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ให้ % _ \ ที่ผู้ใช้พิมพ์ถูกค้นเป็นตัวอักษรจริง ไม่ใช่ wildcard
    private static String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
