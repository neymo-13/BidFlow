package com.bidflow.backend;

import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.repository.AuctionItemRepository;
import com.bidflow.backend.repository.BidRepository;
import com.bidflow.backend.repository.NotificationRepository;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.repository.WalletTransactionRepository;
import com.bidflow.backend.service.AuctionSettlementExecutor;
import com.bidflow.backend.service.BidService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class SettlementTest {

    @Autowired private BidService bidService;
    @Autowired private AuctionSettlementExecutor settlementExecutor;
    @Autowired private UserRepository userRepository;
    @Autowired private AuctionItemRepository auctionItemRepository;
    @Autowired private BidRepository bidRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private WalletTransactionRepository walletTransactionRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User seller;
    private User bidder1;
    private User bidder2;
    private AuctionItem auction;

    @BeforeEach
    void setUp() {
        // Clean up
        notificationRepository.deleteAll();
        bidRepository.deleteAll();
        walletTransactionRepository.deleteAll();
        auctionItemRepository.deleteAll();
        userRepository.deleteAll();

        String suffix = String.valueOf(System.currentTimeMillis());
        seller = createUser("seller_" + suffix, "100000");
        bidder1 = createUser("bidder1_" + suffix, "50000");
        bidder2 = createUser("bidder2_" + suffix, "50000");

        auction = AuctionItem.builder()
                .seller(seller)
                .title("Settlement Test Auction")
                .description("Testing settlement")
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
        notificationRepository.deleteAll();
        bidRepository.deleteAll();
        walletTransactionRepository.deleteAll();
        auctionItemRepository.deleteAll();
        userRepository.deleteAll();
    }

    // =====================================================
    // Test 1: Normal settlement — winner exists
    // =====================================================
    @Test
    @DisplayName("Settlement: highest bidder wins, seller receives money")
    void settlement_withWinner_transfersMoney() {
        // 1. bidder1 bids 1500
        bidService.placeBid(auction.getId(), new BigDecimal("1500"), bidder1.getUsername());

        // 2. bidder2 bids 1800 (outbids)
        bidService.placeBid(auction.getId(), new BigDecimal("1800"), bidder2.getUsername());

        // 3. Capture balances before settlement
        BigDecimal bidder2BalanceBefore = userRepository
                .findById(bidder2.getId()).orElseThrow().getWalletBalance();
        BigDecimal sellerBalanceBefore = userRepository
                .findById(seller.getId()).orElseThrow().getWalletBalance();

        // 4. Set end_time to past (เพื่อให้ settle ได้)
        AuctionItem toSettle = auctionItemRepository.findById(auction.getId()).orElseThrow();
        toSettle.setEndTime(OffsetDateTime.now().minusMinutes(1));
        auctionItemRepository.save(toSettle);

        // 5. Settle manually (ไม่รอ scheduler)
        settlementExecutor.settleAuction(auction.getId());

        // ===== ASSERTIONS =====

        // Auction should be ENDED with winner = bidder2
        AuctionItem settled = auctionItemRepository.findById(auction.getId()).orElseThrow();
        assertThat(settled.getStatus()).isEqualTo(AuctionStatus.ENDED);
        assertThat(settled.getWinner()).isNotNull();
        assertThat(settled.getWinner().getId()).isEqualTo(bidder2.getId());
        assertThat(settled.getCurrentPrice()).isEqualByComparingTo("1800");

        // Seller received the money
        User sellerAfter = userRepository.findById(seller.getId()).orElseThrow();
        assertThat(sellerAfter.getWalletBalance())
                .as("Seller should receive 1800")
                .isEqualByComparingTo(sellerBalanceBefore.add(new BigDecimal("1800")));

        // bidder2's balance unchanged at settlement (already held at bid time)
        User bidder2After = userRepository.findById(bidder2.getId()).orElseThrow();
        assertThat(bidder2After.getWalletBalance())
                .as("bidder2 balance unchanged — money already held at bid")
                .isEqualByComparingTo(bidder2BalanceBefore);

        // Winner notification
        var winnerNotifs = notificationRepository
                .findByUserUsernameOrderByCreatedAtDesc(
                        bidder2.getUsername(),
                        org.springframework.data.domain.PageRequest.of(0, 10)
                );
        assertThat(winnerNotifs.getContent())
                .as("Winner should have notification")
                .anyMatch(n -> n.getTitle().contains("won"));

        // Seller notification
        var sellerNotifs = notificationRepository
                .findByUserUsernameOrderByCreatedAtDesc(
                        seller.getUsername(),
                        org.springframework.data.domain.PageRequest.of(0, 10)
                );
        assertThat(sellerNotifs.getContent())
                .as("Seller should have notification")
                .anyMatch(n -> n.getTitle().contains("sold"));
    }

    // =====================================================
    // Test 2: Settlement with no bids
    // =====================================================
    @Test
    @DisplayName("Settlement: no bids -> auction ENDED without winner")
    void settlement_noBids_endsWithoutWinner() {
        // Set end_time to past
        AuctionItem toSettle = auctionItemRepository.findById(auction.getId()).orElseThrow();
        toSettle.setEndTime(OffsetDateTime.now().minusMinutes(1));
        auctionItemRepository.save(toSettle);

        // Settle
        settlementExecutor.settleAuction(auction.getId());

        // Verify
        AuctionItem settled = auctionItemRepository.findById(auction.getId()).orElseThrow();
        assertThat(settled.getStatus()).isEqualTo(AuctionStatus.ENDED);
        assertThat(settled.getWinner()).isNull();

        // Seller gets "no bids" notification
        var sellerNotifs = notificationRepository
                .findByUserUsernameOrderByCreatedAtDesc(
                        seller.getUsername(),
                        org.springframework.data.domain.PageRequest.of(0, 10)
                );
        assertThat(sellerNotifs.getContent())
                .anyMatch(n -> n.getTitle().toLowerCase().contains("without bids"));
    }

    // =====================================================
    // Test 3: Idempotency — settle twice → no double payout
    // =====================================================
    @Test
    @DisplayName("Settlement: idempotency — settle twice doesn't double-pay")
    void settlement_idempotent_noDoublePayout() {
        // bidder1 bids 1500
        bidService.placeBid(auction.getId(), new BigDecimal("1500"), bidder1.getUsername());

        // Set end_time past
        AuctionItem toSettle = auctionItemRepository.findById(auction.getId()).orElseThrow();
        toSettle.setEndTime(OffsetDateTime.now().minusMinutes(1));
        auctionItemRepository.save(toSettle);

        // Settle 1st time
        settlementExecutor.settleAuction(auction.getId());
        BigDecimal sellerAfterFirst = userRepository.findById(seller.getId())
                .orElseThrow().getWalletBalance();

        // Settle 2nd time (should be skipped)
        settlementExecutor.settleAuction(auction.getId());
        BigDecimal sellerAfterSecond = userRepository.findById(seller.getId())
                .orElseThrow().getWalletBalance();

        // Seller balance must NOT change on 2nd settle
        assertThat(sellerAfterSecond)
                .as("Idempotency: seller balance unchanged on 2nd settle")
                .isEqualByComparingTo(sellerAfterFirst);

        // Auction status still ENDED (not overwritten)
        AuctionItem settled = auctionItemRepository.findById(auction.getId()).orElseThrow();
        assertThat(settled.getStatus()).isEqualTo(AuctionStatus.ENDED);
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
