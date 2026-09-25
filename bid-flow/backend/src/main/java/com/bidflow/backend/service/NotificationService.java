package com.bidflow.backend.service;

import com.bidflow.backend.dto.NotificationResponse;
import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.Notification;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification create(User recipient, AuctionItem auction, String title, String message) {
        Notification notification = Notification.builder()
                .user(recipient)
                .auctionItem(auction)
                .title(title)
                .message(message)
                .read(false)
                .build();
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(String username, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository
                .findByUserUsernameOrderByCreatedAtDesc(username, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public void markAsRead(Long notificationId, String username) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!n.getUser().getUsername().equals(username)) {
            throw new org.springframework.security.access.AccessDeniedException("Not your notification");
        }
        n.setRead(true);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getRead(),
                n.getAuctionItem() != null ? n.getAuctionItem().getId() : null,
                n.getCreatedAt()
        );
    }
}
