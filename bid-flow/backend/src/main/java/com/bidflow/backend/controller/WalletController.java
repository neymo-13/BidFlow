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
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

	private final WalletService walletService;

    // =====================================================
    // 1. ดูยอดเงินใน wallet
    // GET /api/wallet/{userId}
    // =====================================================
    @GetMapping("/{userId}")
    public WalletResponse getWallet(@PathVariable Long userId) {
        return walletService.getWallet(userId);
    }

    // =====================================================
    // 2. ฝากเงิน
    // POST /api/wallet/{userId}/deposit
    // Body: { "amount": 5000.00 }
    // =====================================================
    @PostMapping("/{userId}/deposit")
    public ResponseEntity<WalletTransactionResponse> deposit(
            @PathVariable Long userId,
            @Valid @RequestBody DepositRequest request) {

        WalletTransactionResponse response = walletService.deposit(userId, request.amount());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================
    // 3. ถอนเงิน
    // POST /api/wallet/{userId}/withdraw
    // Body: { "amount": 1000.00 }
    // =====================================================
    @PostMapping("/{userId}/withdraw")
    public ResponseEntity<WalletTransactionResponse> withdraw(
            @PathVariable Long userId,
            @Valid @RequestBody WithdrawRequest request) {

        WalletTransactionResponse response = walletService.withdraw(userId, request.amount());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }


    // =====================================================
    // 4. ดูประวัติ transaction
    // GET /api/wallet/{userId}/transactions?page=0&size=20
    // =====================================================
    @GetMapping("/{userId}/transactions")
    public Page<WalletTransactionResponse> getTransactions(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return walletService.getTransactions(userId, page, size);
    }
}
