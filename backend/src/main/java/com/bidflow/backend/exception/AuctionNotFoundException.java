package com.bidflow.backend.exception;

public class AuctionNotFoundException extends RuntimeException {

    public AuctionNotFoundException(Long auctionId) {
        super("Auction not found: " + auctionId);
    }
}
