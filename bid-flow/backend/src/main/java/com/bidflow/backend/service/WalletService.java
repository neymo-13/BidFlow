package com.bidflow.backend.service;

import com.bidflow.backend.dto.WalletResponse;
import com.bidflow.backend.dto.WalletTransactionResponse;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.entity.WalletTransaction;
import com.bidflow.backend.enums.ReferenceType;
import com.bidflow.backend.enums.TransactionType;
import com.bidflow.backend.exception.InsufficientBalanceException;
import com.bidflow.backend.exception.UserNotFoundException;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final UserRepository userRepository;
    private final WalletTransactionRepository walletTransactionRepository;

    // =====================================================
    // 1. ดูยอดเงินใน wallet
    // =====================================================
    @Transactional(readOnly = true)
    public WalletResponse getWallet(Long userId) {
        User user = findUser(userId);
        return new WalletResponse(
                user.getId(),
                user.getUsername(),
                user.getWalletBalance()
        );
    }

    // =====================================================
    // 2. ฝากเงิน
    // =====================================================
    @Transactional // ถ้า method นี้ throw error | ทุก DB change ที่ทำใน method นี้จะ rollback ทั้งหมด
	public WalletTransactionResponse deposit(Long userId, BigDecimal amount) {
		User user = findUser(userId);
		return depositInternal(user, amount);
	}

	private WalletTransactionResponse depositInternal(User user, BigDecimal amount) {
        // 1) อัปเดตยอดเงิน
        BigDecimal newBalance = user.getWalletBalance().add(amount);
        user.setWalletBalance(newBalance);

        // 2) บันทึก ledger
        WalletTransaction tx = WalletTransaction.builder()
                .user(user)
                .amount(amount)
                .balanceAfter(newBalance)
                .type(TransactionType.DEPOSIT)
                .description("Deposit " + amount)
                .build();

        walletTransactionRepository.save(tx);
        userRepository.save(user);

        return toResponse(tx);
    }

    // =====================================================
    // 3. ถอนเงิน
    // =====================================================
    @Transactional
	public WalletTransactionResponse withdraw(Long userId, BigDecimal amount) {
		User user = findUser(userId);
		return withdrawInternal(user, amount);
	}

	private WalletTransactionResponse withdrawInternal(User user, BigDecimal amount) {

        // 1) เช็คยอดเงิน
        if (user.getWalletBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    user.getId(),
                    user.getWalletBalance(),
                    amount
            );
        }

        // 2) อัปเดตยอดเงิน
        BigDecimal newBalance = user.getWalletBalance().subtract(amount);
        user.setWalletBalance(newBalance);

        // 3) บันทึก ledger
        WalletTransaction tx = WalletTransaction.builder()
                .user(user)
                .amount(amount.negate())     // ← ติดลบ เพราะเงินออก
                .balanceAfter(newBalance)
                .type(TransactionType.WITHDRAW)
                .description("Withdraw " + amount)
                .build();

        walletTransactionRepository.save(tx);
        userRepository.save(user);

        return toResponse(tx);
    }

    // =====================================================
    // 4. ดูประวัติ transaction (paged)
    // =====================================================
    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> getTransactions(Long userId, int page, int size) {
        // เช็คว่า user มีจริง
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException(userId);
        }

        Pageable pageable = PageRequest.of(page, size);
        return walletTransactionRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    // =====================================================
    // Helper methods
    // =====================================================

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    private WalletTransactionResponse toResponse(WalletTransaction tx) {
        return new WalletTransactionResponse(
                tx.getId(),
                tx.getType(),
                tx.getAmount(),
                tx.getBalanceAfter(),
                tx.getReferenceType(),
                tx.getReferenceId(),
                tx.getDescription(),
                tx.getCreatedAt()
        );
    }

	@Transactional(readOnly = true)
	public WalletResponse getWalletByUsername(String username) {
		User user = findUserByUsername(username);
		return new WalletResponse(
				user.getId(),
				user.getUsername(),
				user.getWalletBalance()
		);
	}

	private User findUserByUsername(String username) {
		return userRepository.findByUsername(username)
				.orElseThrow(() -> new UserNotFoundException("User not found: " + username));
	}

	// =====================================================
	// ฝากเงิน (by username)
	// =====================================================
	@Transactional
	public WalletTransactionResponse depositByUsername(String username, BigDecimal amount) {
		User user = findUserByUsername(username);
		return depositInternal(user, amount);
	}

	// =====================================================
	// ถอนเงิน (by username)
	// =====================================================
	@Transactional
	public WalletTransactionResponse withdrawByUsername(String username, BigDecimal amount) {
		User user = findUserByUsername(username);
		return withdrawInternal(user, amount);
	}

	// =====================================================
	// ดู transactions (by username)
	// =====================================================
	@Transactional(readOnly = true)
	public Page<WalletTransactionResponse> getTransactionsByUsername(
			String username, int page, int size) {

		User user = findUserByUsername(username);
		Pageable pageable = PageRequest.of(page, size);
		return walletTransactionRepository
				.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
				.map(this::toResponse);
	}

	// =====================================================
	// Hold เงิน (ใช้ตอน bid)
	// =====================================================
	@Transactional
	public WalletTransaction hold(
			User user,
			BigDecimal amount,
			Long auctionItemId
	) {
		if (user.getWalletBalance().compareTo(amount) < 0) {
			throw new InsufficientBalanceException(
					user.getId(),
					user.getWalletBalance(),
					amount
			);
		}

		BigDecimal newBalance = user.getWalletBalance().subtract(amount);
		user.setWalletBalance(newBalance);

		WalletTransaction tx = WalletTransaction.builder()
				.user(user)
				.amount(amount.negate())
				.balanceAfter(newBalance)
				.type(TransactionType.BID_HOLD)
				.referenceType(ReferenceType.AUCTION_ITEM)
				.referenceId(auctionItemId)
				.description("Hold for bid on auction " + auctionItemId)
				.build();

		walletTransactionRepository.save(tx);
		userRepository.save(user);

		return tx;
	}

	// =====================================================
	// Release เงิน (ใช้ตอนถูก outbid)
	// =====================================================
	@Transactional
	public WalletTransaction release(
			User user,
			BigDecimal amount,
			Long auctionItemId
	) {
		BigDecimal newBalance = user.getWalletBalance().add(amount);
		user.setWalletBalance(newBalance);

		WalletTransaction tx = WalletTransaction.builder()
				.user(user)
				.amount(amount)
				.balanceAfter(newBalance)
				.type(TransactionType.BID_RELEASE)
				.referenceType(ReferenceType.AUCTION_ITEM)
				.referenceId(auctionItemId)
				.description("Release from outbid on auction " + auctionItemId)
				.build();

		walletTransactionRepository.save(tx);
		userRepository.save(user);

		return tx;
	}

	// =====================================================
	// Settle: winner's held money → seller's balance
	// (winner's money already held — just credit seller)
	// =====================================================
	@Transactional
	public void settleToSeller(User winner, User seller, BigDecimal amount, Long auctionId) {
		// 1) Seller ได้เงิน
		BigDecimal newSellerBalance = seller.getWalletBalance().add(amount);
		seller.setWalletBalance(newSellerBalance);

		WalletTransaction sellerTx = WalletTransaction.builder()
				.user(seller)
				.amount(amount)
				.balanceAfter(newSellerBalance)
				.type(TransactionType.SELLER_PAYOUT)
				.referenceType(ReferenceType.AUCTION_ITEM)
				.referenceId(auctionId)
				.description("Payout for auction " + auctionId)
				.build();
		walletTransactionRepository.save(sellerTx);
		userRepository.save(seller);

	}
}