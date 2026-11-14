package com.bidflow.backend.config;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.Category;
import com.bidflow.backend.entity.Bid;
import com.bidflow.backend.entity.ItemImage;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.CategoryRepository;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.repository.BidRepository;
import com.bidflow.backend.repository.ItemImageRepository;
import com.bidflow.backend.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.time.OffsetDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
@Profile("!test")   // รันทุก profile ยกเว้น test
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AuctionItemRepository auctionItemRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final BidRepository bidRepository;
    private final ItemImageRepository itemImageRepository;
    private final StorageService storageService;

    private static final String DEMO_PREFIX = "BidFlow Demo ";
    private static final List<SeedAuction> DEMO_AUCTIONS = List.of(
            new SeedAuction("Retro Film Camera", "cameras", "18000", "500", 1),
            new SeedAuction("Studio Headphones", "electronics", "4200", "200", 2),
            new SeedAuction("Mechanical Keyboard", "electronics", "6500", "250", 3),
            new SeedAuction("Handmade Ceramic Set", "home-living", "2800", "100", 4),
            new SeedAuction("Limited Sneakers", "fashion", "7500", "300", 5),
            new SeedAuction("Classic Leather Jacket", "fashion", "9200", "400", 1),
            new SeedAuction("Automatic Dive Watch", "watches", "28000", "1000", 2),
            new SeedAuction("Signed Art Print", "collectibles", "5600", "200", 3),
            new SeedAuction("Japanese Tea Collection", "home-living", "3400", "150", 4),
            new SeedAuction("Portable Projector", "electronics", "8900", "350", 5),
            new SeedAuction("Vintage Typewriter", "collectibles", "12000", "500", 1),
            new SeedAuction("Designer Sunglasses", "fashion", "4800", "200", 2),
            new SeedAuction("Mirrorless Camera Lens", "cameras", "22000", "750", 3),
            new SeedAuction("Mountain Bike", "other", "16500", "500", 4),
            new SeedAuction("First Edition Novel", "collectibles", "3900", "150", 5),
            new SeedAuction("Smart Home Hub", "electronics", "3100", "100", 1),
            new SeedAuction("Handcrafted Desk Lamp", "home-living", "2600", "100", 2),
            new SeedAuction("Gold-Plated Fountain Pen", "collectibles", "6800", "250", 3),
            new SeedAuction("Next-Year Collector Watch", "watches", "36000", "1000", 4),
            new SeedAuction("Next-Year Limited Camera", "cameras", "29500", "1000", 5)
    );

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            seedBidsIfMissing();
            ensureActiveAuction();
            seedDemoCatalog();
            log.info("DataSeeder: database already has users — skipped base seed");
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
        //    หมวดถูกสร้างไว้แล้วโดย Flyway (V2) ซึ่งรันก่อน seeder เสมอ
        // =====================================================
        OffsetDateTime now = OffsetDateTime.now();
        Category electronics = category("electronics");

        AuctionItem iphone = createAuction(
                bob,
                electronics,
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
                electronics,
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
                electronics,
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
                category("watches"),
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
                category("cameras"),
                "Vintage Leica M3 Camera",
                "1954 production. Fully functional. Recently CLA'd. " +
                        "Collector's item. Comes with original leather case.",
                new BigDecimal("45000"),
                new BigDecimal("1500"),
                now.minusHours(4),
                now.plusDays(10)
        );

        log.info("DataSeeder: created 5 active auctions");
        seedBids(alice, charlie, iphone, macbook, airpods, rolex, vintage);
        seedDemoCatalog();
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

    private void seedBidsIfMissing() {
        User alice = userRepository.findByUsername("alice").orElse(null);
        User charlie = userRepository.findByUsername("charlie").orElse(null);
        if (alice == null || charlie == null) return;
        AuctionItem iphone = auctionItemRepository.findByTitle("iPhone 15 Pro Max").orElse(null);
        AuctionItem macbook = auctionItemRepository.findByTitle("MacBook Pro M3 14\"").orElse(null);
        AuctionItem airpods = auctionItemRepository.findByTitle("AirPods Pro 2nd Gen").orElse(null);
        AuctionItem rolex = auctionItemRepository.findByTitle("Rolex Submariner Date").orElse(null);
        AuctionItem vintage = auctionItemRepository.findByTitle("Vintage Leica M3 Camera").orElse(null);
        if (iphone != null && macbook != null && airpods != null && rolex != null && vintage != null) {
            seedBids(alice, charlie, iphone, macbook, airpods, rolex, vintage);
        }
    }

    private void ensureActiveAuction() {
        if (auctionItemRepository.countByStatus(AuctionStatus.ACTIVE) > 0) return;
        User seller = userRepository.findByUsername("bob").orElse(null);
        User alice = userRepository.findByUsername("alice").orElse(null);
        User charlie = userRepository.findByUsername("charlie").orElse(null);
        if (seller == null || alice == null || charlie == null) return;
        AuctionItem auction = createAuction(seller, category("cameras"),
                "BidFlow Starter Camera", "A live demo auction with real database bids.",
                new BigDecimal("12000"), new BigDecimal("500"),
                OffsetDateTime.now().minusMinutes(10), OffsetDateTime.now().plusDays(7));
        seedBid(auction, alice, "12500", 1);
        seedBid(auction, charlie, "13000", 2);
        log.info("DataSeeder: created active auction '{}' with {} bids", auction.getTitle(), auction.getTotalBids());
    }

    /**
     * Creates a repeatable, data-driven catalog in the database. This is intentionally
     * backend seed data, so the frontend remains fully API-driven.
     */
    private void seedDemoCatalog() {
        User seller = userRepository.findByUsername("bob").orElse(null);
        if (seller == null) return;

        List<AuctionItem> existing = auctionItemRepository.findByTitleStartingWith(DEMO_PREFIX);
        if (existing.size() >= DEMO_AUCTIONS.size()) {
            existing.forEach(this::seedImagesIfMissing);
            return;
        }

        storageService.ensureBucket();
        OffsetDateTime now = OffsetDateTime.now();
        for (int index = 0; index < DEMO_AUCTIONS.size(); index++) {
            final int itemIndex = index;
            SeedAuction seed = DEMO_AUCTIONS.get(itemIndex);
            String title = DEMO_PREFIX + seed.title();
            AuctionItem auction = auctionItemRepository.findByTitle(title).orElseGet(() -> {
                OffsetDateTime endTime = itemIndex >= DEMO_AUCTIONS.size() - 2
                        ? now.plusMonths(itemIndex == DEMO_AUCTIONS.size() - 2 ? 2 : 4)
                        : now.plusDays(3L + itemIndex);
                return createAuction(seller, category(seed.category()), title,
                        "Curated BidFlow demo listing for " + seed.title() + ". Ships from Bangkok.",
                        new BigDecimal(seed.startPrice()), new BigDecimal(seed.increment()),
                        now.minusHours(2L + (itemIndex % 8)), endTime);
            });
            seedImages(auction, seed.title(), seed.category(), seed.imageCount());
        }
        log.info("DataSeeder: ensured {} demo auctions with varied image galleries", DEMO_AUCTIONS.size());
    }

    private void seedImagesIfMissing(AuctionItem auction) {
        if (!itemImageRepository.findByAuctionItemIdOrderByDisplayOrderAscIdAsc(auction.getId()).isEmpty()) return;
        String label = auction.getTitle().replaceFirst("^" + DEMO_PREFIX, "");
        seedImages(auction, label, auction.getCategory().getName(), 1 + (auction.getId().intValue() % 5));
    }

    private void seedImages(AuctionItem auction, String title, String categoryName, int imageCount) {
        if (!itemImageRepository.findByAuctionItemIdOrderByDisplayOrderAscIdAsc(auction.getId()).isEmpty()) return;
        for (int imageIndex = 0; imageIndex < imageCount; imageIndex++) {
            String key = "auctions/" + auction.getId() + "/seed-" + imageIndex + ".svg";
            try {
                storageService.upload(key, demoSvg(title, categoryName, imageIndex + 1, imageCount), "image/svg+xml");
                itemImageRepository.save(ItemImage.builder()
                        .auctionItem(auction)
                        .objectKey(key)
                        .isPrimary(imageIndex == 0)
                        .displayOrder(imageIndex)
                        .build());
            } catch (RuntimeException ex) {
                log.warn("DataSeeder: could not upload demo image {} for auction {}: {}", imageIndex, auction.getId(), ex.getMessage());
                return;
            }
        }
    }

    private byte[] demoSvg(String title, String categoryName, int imageNumber, int totalImages) {
        String[] colors = {"#2563eb", "#7c3aed", "#0891b2", "#059669", "#ea580c"};
        String primary = colors[(imageNumber - 1) % colors.length];
        String secondary = colors[(imageNumber + 1) % colors.length];
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1200 800\">"
                + "<defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"" + primary + "\"/><stop offset=\"1\" stop-color=\"" + secondary + "\"/></linearGradient></defs>"
                + "<rect width=\"1200\" height=\"800\" fill=\"url(#g)\"/><circle cx=\"980\" cy=\"120\" r=\"250\" fill=\"#ffffff\" opacity=\".12\"/>"
                + "<text x=\"70\" y=\"120\" fill=\"#ffffff\" font-family=\"Arial\" font-size=\"34\" font-weight=\"700\">BIDFLOW</text>"
                + "<text x=\"70\" y=\"430\" fill=\"#ffffff\" font-family=\"Arial\" font-size=\"58\" font-weight=\"700\">" + escapeXml(title) + "</text>"
                + "<text x=\"70\" y=\"500\" fill=\"#ffffff\" opacity=\".85\" font-family=\"Arial\" font-size=\"30\">" + escapeXml(categoryName) + " • Gallery " + imageNumber + "/" + totalImages + "</text></svg>";
        return svg.getBytes(StandardCharsets.UTF_8);
    }

    private String escapeXml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }

    private record SeedAuction(String title, String category, String startPrice, String increment, int imageCount) {}

    private void seedBids(User alice, User charlie, AuctionItem iphone, AuctionItem macbook,
                           AuctionItem airpods, AuctionItem rolex, AuctionItem vintage) {
        if (bidRepository.countByAuctionItemId(iphone.getId()) == 0) {
            seedBid(iphone, alice, "31500", 1); seedBid(iphone, charlie, "32500", 2); seedBid(iphone, alice, "33500", 3);
        }
        if (bidRepository.countByAuctionItemId(macbook.getId()) == 0) {
            seedBid(macbook, charlie, "67000", 1); seedBid(macbook, alice, "68500", 2);
        }
        if (bidRepository.countByAuctionItemId(airpods.getId()) == 0) {
            seedBid(airpods, alice, "6200", 1); seedBid(airpods, charlie, "6600", 2);
        }
        if (bidRepository.countByAuctionItemId(rolex.getId()) == 0) seedBid(rolex, alice, "360000", 1);
        if (bidRepository.countByAuctionItemId(vintage.getId()) == 0) {
            seedBid(vintage, charlie, "47000", 1); seedBid(vintage, alice, "48500", 2);
        }
        log.info("DataSeeder: created {} sample bids", bidRepository.count());
    }

    private void seedBid(AuctionItem auction, User bidder, String amount, long sequence) {
        BigDecimal bidAmount = new BigDecimal(amount);
        bidRepository.save(Bid.builder().auctionItem(auction).bidder(bidder)
                .bidAmount(bidAmount).bidSequence(sequence).build());
        auction.setCurrentPrice(bidAmount);
        auction.setTotalBids((int) sequence);
        auctionItemRepository.save(auction);
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

    private Category category(String slug) {
        return categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalStateException("Missing category '" + slug + "' — check Flyway V2"));
    }

    private AuctionItem createAuction(
            User seller,
            Category category,
            String title,
            String description,
            BigDecimal startPrice,
            BigDecimal minIncrement,
            OffsetDateTime startTime,
            OffsetDateTime endTime
    ) {
        AuctionItem auction = AuctionItem.builder()
                .seller(seller)
                .category(category)
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

