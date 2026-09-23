package com.bidflow.backend.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(Long userId) {
        super("User not found: " + userId);
    }

    public UserNotFoundException(String username) {
        super("User not found: " + username);
    }
}