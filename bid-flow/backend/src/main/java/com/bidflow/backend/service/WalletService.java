package com.bidflow.backend.service;

import com.bidflow.backend.dto.WalletResponse;
import com.bidflow.backend.dto.WalletTransactionResponse;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.entity.WalletTransaction;
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
import org.springframework.web.bind.annotation.RequestMapping;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@RequestMapping("/api/wallet")
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
	/*
	@GetMapping("/me")
    public ResponseEntity<WalletResponse> getMyWallet(Authentication authentication) {
        String username = authentication.getName(); // ดึง username จาก JWT Token
        return ResponseEntity.ok(walletService.getWalletByUsername(username));
    }
	*/

    // =====================================================
    // 2. ฝากเงิน
    // =====================================================
    @Transactional // ถ้า method นี้ throw error | ทุก DB change ที่ทำใน method นี้จะ rollback ทั้งหมด
    public WalletTransactionResponse deposit(Long userId, BigDecimal amount) {
        User user = findUser(userId);

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
	/*
	@PostMapping("/me/deposit")
    public ResponseEntity<WalletTransactionResponse> deposit(
            Authentication authentication,
            @RequestBody DepositRequest request) {
        String username = authentication.getName();
        return ResponseEntity.ok(walletService.depositByUsername(username, request.getAmount()));
    }
	*/

    // =====================================================
    // 3. ถอนเงิน
    // =====================================================
    @Transactional
    public WalletTransactionResponse withdraw(Long userId, BigDecimal amount) {
        User user = findUser(userId);

        // 1) เช็คยอดเงิน
        if (user.getWalletBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    userId,
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
	/*
	@PostMapping("/me/withdraw")
    public ResponseEntity<WalletTransactionResponse> withdraw(
            Authentication authentication,
            @RequestBody WithdrawRequest request) {
        String username = authentication.getName();
        return ResponseEntity.ok(walletService.withdrawByUsername(username, request.getAmount()));
    }
	*/

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
	/*
	@GetMapping("/me/transactions")
    public ResponseEntity<Page<WalletTransactionResponse>> getMyTransactions(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String username = authentication.getName();
        return ResponseEntity.ok(walletService.getTransactionsByUsername(username, page, size));
    }
	*/

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
}