package com.bidflow.backend.controller;

import com.bidflow.backend.dto.DepositRequest;
import com.bidflow.backend.dto.WalletResponse;
import com.bidflow.backend.dto.WalletTransactionResponse;
import com.bidflow.backend.dto.WithdrawRequest;
import com.bidflow.backend.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    // =====================================================
    // Helper: ดึง username จาก SecurityContext
    // =====================================================
    private String getCurrentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // =====================================================
    // 1. ดูยอดเงินของตัวเอง
    // GET /api/wallet/me
    // =====================================================
    @GetMapping("/me")
    public WalletResponse getMyWallet() {
        return walletService.getWalletByUsername(getCurrentUsername());
    }

    // =====================================================
    // 2. ฝากเงิน
    // POST /api/wallet/me/deposit
    // Body: { "amount": 5000.00 }
    // =====================================================
    @PostMapping("/me/deposit")
    public ResponseEntity<WalletTransactionResponse> deposit(
            @Valid @RequestBody DepositRequest request) {

        WalletTransactionResponse response = walletService.depositByUsername(
                getCurrentUsername(),
                request.amount()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // 3. ถอนเงิน
    // POST /api/wallet/me/withdraw
    // Body: { "amount": 1000.00 }
    // =====================================================
    @PostMapping("/me/withdraw")
    public ResponseEntity<WalletTransactionResponse> withdraw(
            @Valid @RequestBody WithdrawRequest request) {

        WalletTransactionResponse response = walletService.withdrawByUsername(
                getCurrentUsername(),
                request.amount()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // 4. ดูประวัติ transaction ของตัวเอง
    // GET /api/wallet/me/transactions?page=0&size=20
    // =====================================================
    @GetMapping("/me/transactions")
    public Page<WalletTransactionResponse> getMyTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return walletService.getTransactionsByUsername(
                getCurrentUsername(),
                page,
                size
        );
    }
}