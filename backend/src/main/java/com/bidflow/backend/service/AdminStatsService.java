package com.bidflow.backend.service;

import com.bidflow.backend.dto.AdminStatsResponse;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.enums.Role;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final EntityManager entityManager;

    // =====================================================
    // ตัวเลขรวมของทั้งระบบ (อ่านอย่างเดียว — query นับตรงๆ ไม่มี cache)
    // =====================================================
    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        long totalUsers = count("select count(u) from User u");
        long suspendedUsers = count("select count(u) from User u where u.suspended = true");
        long adminUsers = entityManager
                .createQuery("select count(u) from User u where u.role = :role", Long.class)
                .setParameter("role", Role.ADMIN)
                .getSingleResult();

        // ครบทุก status ตามลำดับของ enum แม้บาง status จะไม่มี auction เลย
        Map<AuctionStatus, Long> auctionsByStatus = new EnumMap<>(AuctionStatus.class);
        for (AuctionStatus status : AuctionStatus.values()) {
            auctionsByStatus.put(status, 0L);
        }
        entityManager
                .createQuery("select a.status, count(a) from AuctionItem a group by a.status", Object[].class)
                .getResultList()
                .forEach(row -> auctionsByStatus.put((AuctionStatus) row[0], (Long) row[1]));

        long totalBids = count("select count(b) from Bid b");

        BigDecimal totalSales = entityManager
                .createQuery("select sum(a.currentPrice) from AuctionItem a "
                        + "where a.status = :ended and a.winner is not null", BigDecimal.class)
                .setParameter("ended", AuctionStatus.ENDED)
                .getSingleResult();

        return new AdminStatsResponse(
                totalUsers,
                suspendedUsers,
                adminUsers,
                auctionsByStatus,
                totalBids,
                totalSales != null ? totalSales : BigDecimal.ZERO
        );
    }

    private long count(String jpql) {
        return entityManager.createQuery(jpql, Long.class).getSingleResult();
    }
}
