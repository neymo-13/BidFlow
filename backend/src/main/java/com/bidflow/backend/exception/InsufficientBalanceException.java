package com.bidflow.backend.exception;

import java.math.BigDecimal;

public class InsufficientBalanceException extends RuntimeException {

    private final Long userId;
    private final BigDecimal currentBalance;
    private final BigDecimal requestedAmount;

    public InsufficientBalanceException(Long userId,
                                        BigDecimal currentBalance,
                                        BigDecimal requestedAmount) {
        super(String.format(
                "Insufficient balance for user %d: current=%s, requested=%s",
                userId, currentBalance, requestedAmount
        ));
        this.userId = userId;
        this.currentBalance = currentBalance;
        this.requestedAmount = requestedAmount;
    }

    public Long getUserId() { return userId; }
    public BigDecimal getCurrentBalance() { return currentBalance; }
    public BigDecimal getRequestedAmount() { return requestedAmount; }
}
