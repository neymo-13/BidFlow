package com.bidflow.backend;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.BidRepository;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.repository.WalletTransactionRepository;
import com.bidflow.backend.service.BidService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_METHOD)
class ConcurrentBiddingTest {

    @Autowired private BidService bidService;
    @Autowired private UserRepository userRepository;
    @Autowired private AuctionItemRepository auctionItemRepository;
    @Autowired private BidRepository bidRepository;
    @Autowired private WalletTransactionRepository walletTransactionRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User seller;
    private User bidder1;
    private User bidder2;
    private AuctionItem auction;

    @BeforeEach
    void setUp() {
        // Clean up
        bidRepository.deleteAll();
        walletTransactionRepository.deleteAll();
        auctionItemRepository.deleteAll();
        userRepository.deleteAll();

        // Create users with unique names
        String suffix = String.valueOf(System.currentTimeMillis());
        seller = createUser("seller_" + suffix, "100000");
        bidder1 = createUser("bidder1_" + suffix, "50000");
        bidder2 = createUser("bidder2_" + suffix, "50000");

        // Create auction ACTIVE
        auction = AuctionItem.builder()
                .seller(seller)
                .title("Test Auction")
                .description("Concurrency Test")
                .startPrice(new BigDecimal("1000"))
                .minIncrement(new BigDecimal("100"))
                .currentPrice(new BigDecimal("1000"))
                .status(AuctionStatus.ACTIVE)
                .startTime(OffsetDateTime.now().minusHours(1))
                .endTime(OffsetDateTime.now().plusHours(1))
                .totalBids(0)
                .build();
        auction = auctionItemRepository.save(auction);
    }

    @AfterEach
    void tearDown() {
        bidRepository.deleteAll();
        walletTransactionRepository.deleteAll();
        auctionItemRepository.deleteAll();
        userRepository.deleteAll();
    }

    // =====================================================
    // KEY TEST: 10 threads bid same amount
    // =====================================================
    @Test
    @DisplayName("10 threads bid the same amount -> only 1 succeeds")
    void concurrentBids_sameAmount_onlyOneWins() throws InterruptedException {
        int threadCount = 10;
        BigDecimal bidAmount = new BigDecimal("1500");

        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final User bidder = (i % 2 == 0) ? bidder1 : bidder2;
            executor.submit(() -> {
                try {
                    startLatch.await();   // รอทุก thread พร้อมกัน
                    bidService.placeBid(auction.getId(), bidAmount, bidder.getUsername());
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();   // เริ่ม
        boolean finished = doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        // ===== ASSERTIONS =====
        assertThat(finished).as("Test should finish within 30s").isTrue();
        assertThat(successCount.get())
                .as("Only 1 bid should succeed")
                .isEqualTo(1);
        assertThat(failureCount.get())
                .as("9 bids should fail")
                .isEqualTo(threadCount - 1);

        // Verify DB state
        AuctionItem updated = auctionItemRepository.findById(auction.getId()).orElseThrow();
        assertThat(updated.getCurrentPrice())
                .as("Current price should equal the winning bid")
                .isEqualByComparingTo(bidAmount);
        assertThat(updated.getTotalBids()).isEqualTo(1);

        var bids = bidRepository.findByAuctionItemIdOrderByCreatedAtDesc(
                auction.getId(),
                org.springframework.data.domain.PageRequest.of(0, 100)
        );
        assertThat(bids.getTotalElements())
                .as("Only 1 bid recorded")
                .isEqualTo(1);
    }

    // =====================================================
    // Incremental bids: 10 threads bid increasing amounts
    // =====================================================
    @Test
    @DisplayName("10 threads bid increasing amounts -> sequential acceptance")
    void concurrentBids_increasingAmounts() throws InterruptedException {
        int threadCount = 10;

        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final BigDecimal amount = new BigDecimal(1100 + (i * 100));   // 1100, 1200, ..., 2000
            final User bidder = (i % 2 == 0) ? bidder1 : bidder2;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    bidService.placeBid(auction.getId(), amount, bidder.getUsername());
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    // ignore
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        // At least 1 succeeds; exact count depends on thread order
        assertThat(successCount.get()).isGreaterThanOrEqualTo(1);

        // current_price should be the highest successful bid
        AuctionItem updated = auctionItemRepository.findById(auction.getId()).orElseThrow();
        assertThat(updated.getCurrentPrice()).isGreaterThanOrEqualTo(new BigDecimal("1100"));
        assertThat(updated.getCurrentPrice()).isLessThanOrEqualTo(new BigDecimal("2000"));
    }

    // =====================================================
    // Helper
    // =====================================================
    private User createUser(String username, String balance) {
        User user = User.builder()
                .username(username)
                .email(username + "@test.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Test User")
                .walletBalance(new BigDecimal(balance))
                .build();
        return userRepository.save(user);
    }
}
