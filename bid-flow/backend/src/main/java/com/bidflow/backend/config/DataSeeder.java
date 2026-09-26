package com.bidflow.backend.config;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
@Profile("!test")   // รันทุก profile ยกเว้น test
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AuctionItemRepository auctionItemRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("DataSeeder: database already has data — skipping seed");
            return;
        }

        log.info("DataSeeder: seeding initial data...");

        // =====================================================
        // 1. Create Users
        // =====================================================
        User alice = createUser("alice", "alice@test.com", "Alice Wonder");
        User bob = createUser("bob", "bob@test.com", "Bob Builder");
        User charlie = createUser("charlie", "charlie@test.com", "Charlie Chaplin");

        log.info("DataSeeder: created 3 users (alice, bob, charlie) — password: password123");

        // =====================================================
        // 2. Create Auctions (ACTIVE)
        // =====================================================
        OffsetDateTime now = OffsetDateTime.now();

        AuctionItem iphone = createAuction(
                bob,
                "iPhone 15 Pro Max",
                "Brand new, sealed in box. 256GB, Titanium Blue. " +
                        "Full warranty. Ships within 24 hours.",
                new BigDecimal("30000"),
                new BigDecimal("500"),
                now.minusHours(1),
                now.plusDays(7)
        );

        AuctionItem macbook = createAuction(
                bob,
                "MacBook Pro M3 14\"",
                "M3 Pro chip, 18GB RAM, 512GB SSD. Space Black. " +
                        "Battery cycle count: 12. AppleCare+ until 2027.",
                new BigDecimal("65000"),
                new BigDecimal("1000"),
                now.minusHours(2),
                now.plusDays(5)
        );

        AuctionItem airpods = createAuction(
                bob,
                "AirPods Pro 2nd Gen",
                "USB-C version. Sealed. Active Noise Cancellation. " +
                        "Adaptive Audio. Perfect for commute and workout.",
                new BigDecimal("6000"),
                new BigDecimal("200"),
                now.minusHours(3),
                now.plusDays(3)
        );

        AuctionItem rolex = createAuction(
                bob,
                "Rolex Submariner Date",
                "Pre-owned, excellent condition. 2019 model. " +
                        "Original box and papers included. Recently serviced.",
                new BigDecimal("350000"),
                new BigDecimal("5000"),
                now.minusMinutes(30),
                now.plusDays(14)
        );

        AuctionItem vintage = createAuction(
                bob,
                "Vintage Leica M3 Camera",
                "1954 production. Fully functional. Recently CLA'd. " +
                        "Collector's item. Comes with original leather case.",
                new BigDecimal("45000"),
                new BigDecimal("1500"),
                now.minusHours(4),
                now.plusDays(10)
        );

        log.info("DataSeeder: created 5 active auctions");
        log.info("DataSeeder: done! Total users: {}, auctions: {}",
                userRepository.count(), auctionItemRepository.count());

        log.info("========================================");
        log.info("🎉 Seed data ready!");
        log.info("Login credentials:");
        log.info("  alice   / password123");
        log.info("  bob     / password123");
        log.info("  charlie / password123");
        log.info("========================================");
    }

    // =====================================================
    // Helpers
    // =====================================================
    private User createUser(String username, String email, String fullName) {
        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName(fullName)
                .walletBalance(new BigDecimal("100000.00"))   // 100k starting balance
                .build();
        return userRepository.save(user);
    }

    private AuctionItem createAuction(
            User seller,
            String title,
            String description,
            BigDecimal startPrice,
            BigDecimal minIncrement,
            OffsetDateTime startTime,
            OffsetDateTime endTime
    ) {
        AuctionItem auction = AuctionItem.builder()
                .seller(seller)
                .title(title)
                .description(description)
                .startPrice(startPrice)
                .minIncrement(minIncrement)
                .currentPrice(startPrice)
                .status(AuctionStatus.ACTIVE)
                .startTime(startTime)
                .endTime(endTime)
                .totalBids(0)
                .version(0L)
                .build();
        return auctionItemRepository.save(auction);
    }
}
