package com.bidflow.backend.service;

import com.bidflow.backend.dto.AuctionImageResponse;
import com.bidflow.backend.entity.AuctionItem;
import com.bidflow.backend.entity.ItemImage;
import com.bidflow.backend.enums.AuctionStatus;
import com.bidflow.backend.repository.ItemImageRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.exception.SdkException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

// อัปโหลด / ลบรูปสินค้า (เฉพาะเจ้าของ + DRAFT)
@Service
@RequiredArgsConstructor
@Slf4j
public class AuctionImageService {

    static final int MAX_IMAGES = 5;
    static final long MAX_BYTES = 5L * 1024 * 1024;

    private final ItemImageRepository itemImageRepository;
    private final StorageService storageService;
    private final EntityManager entityManager;

    // =====================================================
    // 1. อัปโหลดรูป → object storage + แถวใน item_images
    // =====================================================
    @Transactional
    public AuctionImageResponse upload(Long auctionId, MultipartFile file, String currentUsername) {
        AuctionItem auction = lockEditableAuction(auctionId, currentUsername);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Image must be at most 5 MB");
        }

        byte[] content = readBytes(file);
        // ตรวจชนิดจากเนื้อไฟล์จริง ไม่เชื่อชื่อไฟล์หรือ Content-Type ที่ client ส่งมา
        ImageType type = ImageType.detect(content)
                .orElseThrow(() -> new IllegalArgumentException("Only JPEG, PNG or WebP images are allowed"));

        List<ItemImage> existing = itemImageRepository.findByAuctionItemIdOrderByDisplayOrderAscIdAsc(auctionId);
        if (existing.size() >= MAX_IMAGES) {
            throw new IllegalArgumentException("An auction can have at most " + MAX_IMAGES + " images");
        }

        String key = "auctions/" + auctionId + "/" + UUID.randomUUID() + "." + type.extension;
        storageService.upload(key, content, type.contentType);

        ItemImage image = ItemImage.builder()
                .auctionItem(auction)
                .objectKey(key)
                .isPrimary(existing.isEmpty())   // รูปแรกเป็นรูปหลัก
                .displayOrder(existing.isEmpty() ? 0 : existing.getLast().getDisplayOrder() + 1)
                .build();
        try {
            itemImageRepository.saveAndFlush(image);
        } catch (RuntimeException e) {
            // บันทึกลง DB ไม่สำเร็จ → ลบไฟล์ที่เพิ่งอัปออก ไม่ให้ค้างใน bucket
            deleteObjectQuietly(key);
            throw e;
        }

        return toResponse(image);
    }

    // =====================================================
    // 2. ลบรูป → ถ้าเป็นรูปหลัก รูปถัดไปจะเป็นรูปหลักแทน
    // =====================================================
    @Transactional
    public void delete(Long auctionId, Long imageId, String currentUsername) {
        lockEditableAuction(auctionId, currentUsername);

        ItemImage image = itemImageRepository.findByIdAndAuctionItemId(imageId, auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Image not found: " + imageId));

        itemImageRepository.delete(image);
        // ลบให้เสร็จก่อนตั้งรูปหลักใหม่ (unique index: 1 auction มีรูปหลักได้รูปเดียว
        // และ Hibernate จะ UPDATE ก่อน DELETE ถ้าไม่ flush)
        itemImageRepository.flush();

        if (image.isPrimary()) {
            itemImageRepository.findByAuctionItemIdOrderByDisplayOrderAscIdAsc(auctionId).stream()
                    .findFirst()
                    .ifPresent(next -> next.setPrimary(true));
        }

        deleteObjectQuietly(image.getObjectKey());
    }

    // =====================================================
    // 3. รูปทั้งหมดของ auction (หน้า detail) — URL เป็น presigned อายุสั้น
    // =====================================================
    @Transactional(readOnly = true)
    public List<AuctionImageResponse> getImages(Long auctionId) {
        return itemImageRepository.findByAuctionItemIdOrderByDisplayOrderAscIdAsc(auctionId).stream()
                .map(this::toResponse)
                .toList();
    }

    // =====================================================
    // 4. auctionId → URL รูปหลัก สำหรับหน้า list (query เดียวต่อหน้า)
    //    auction ที่ไม่มีรูปจะไม่อยู่ใน map
    // =====================================================
    @Transactional(readOnly = true)
    public Map<Long, String> getPrimaryImageUrls(Collection<Long> auctionIds) {
        if (auctionIds.isEmpty()) {
            return Map.of();
        }
        return itemImageRepository.findPrimaryByAuctionItemIds(auctionIds).stream()
                .collect(Collectors.toMap(
                        image -> image.getAuctionItem().getId(),
                        image -> storageService.presignedGetUrl(image.getObjectKey())
                ));
    }

    // =====================================================
    // Helpers
    // =====================================================

    // ล็อกแถว auction ไว้จนจบ transaction → อัปโหลด/ลบพร้อมกันจะไม่เกิน 5 รูป หรือมีรูปหลัก 2 รูป
    private AuctionItem lockEditableAuction(Long auctionId, String currentUsername) {
        AuctionItem auction = entityManager.find(AuctionItem.class, auctionId, LockModeType.PESSIMISTIC_WRITE);
        if (auction == null) {
            throw new IllegalArgumentException("Auction not found: " + auctionId);
        }
        if (!auction.getSeller().getUsername().equals(currentUsername)) {
            throw new AccessDeniedException("You are not the owner of this auction");
        }
        if (auction.getStatus() != AuctionStatus.DRAFT) {
            throw new IllegalArgumentException(
                    "Cannot change images of auction in status: " + auction.getStatus()
                            + ". Only DRAFT can be modified."
            );
        }
        return auction;
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read uploaded file", e);
        }
    }

    private void deleteObjectQuietly(String key) {
        try {
            storageService.delete(key);
        } catch (SdkException e) {
            log.warn("Storage: could not delete object '{}': {}", key, e.getMessage());
        }
    }

    private AuctionImageResponse toResponse(ItemImage image) {
        return new AuctionImageResponse(
                image.getId(),
                storageService.presignedGetUrl(image.getObjectKey()),
                image.isPrimary(),
                image.getDisplayOrder()
        );
    }

    // ชนิดรูปที่รับ — ตรวจจาก magic bytes ต้นไฟล์
    enum ImageType {
        JPEG("jpg", "image/jpeg"),
        PNG("png", "image/png"),
        WEBP("webp", "image/webp");

        private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
        private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
        private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
        private static final byte[] WEBP_MARK = {'W', 'E', 'B', 'P'};

        final String extension;
        final String contentType;

        ImageType(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }

        static Optional<ImageType> detect(byte[] content) {
            if (startsWith(content, 0, JPEG_SIGNATURE)) {
                return Optional.of(JPEG);
            }
            if (startsWith(content, 0, PNG_SIGNATURE)) {
                return Optional.of(PNG);
            }
            // WebP = "RIFF" + ขนาด 4 ไบต์ + "WEBP"
            if (startsWith(content, 0, RIFF) && startsWith(content, 8, WEBP_MARK)) {
                return Optional.of(WEBP);
            }
            return Optional.empty();
        }

        private static boolean startsWith(byte[] content, int offset, byte[] signature) {
            return content.length >= offset + signature.length
                    && Arrays.equals(content, offset, offset + signature.length, signature, 0, signature.length);
        }
    }
}
