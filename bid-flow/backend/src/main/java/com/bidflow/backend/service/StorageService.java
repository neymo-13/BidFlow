package com.bidflow.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.time.Duration;

// เก็บ / ลบ / สร้าง URL ของไฟล์ใน object storage (bucket แบบ private)
@Service
@Slf4j
public class StorageService {

    private static final String DEFAULT_REGION = "us-east-1";

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final String region;
    private final Duration urlExpiry;

    public StorageService(
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Value("${app.storage.bucket}") String bucket,
            @Value("${app.storage.region}") String region,
            @Value("${app.storage.url-expiry-minutes:60}") long urlExpiryMinutes) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.region = region;
        this.urlExpiry = Duration.ofMinutes(urlExpiryMinutes);
    }

    // =====================================================
    // สร้าง bucket ตอนแอปพร้อมแล้ว (ถ้ายังไม่มี)
    // ต่อ storage ไม่ได้ = แค่ log เตือน แอปยังทำงานส่วนอื่นได้ตามปกติ
    // =====================================================
    @EventListener(ApplicationReadyEvent.class)
    public void ensureBucket() {
        try {
            s3Client.headBucket(b -> b.bucket(bucket));
            log.info("Storage: bucket '{}' is ready", bucket);
        } catch (NoSuchBucketException e) {
            createBucket();
        } catch (SdkException e) {
            log.warn("Storage: cannot reach bucket '{}' — image upload will fail until storage is available: {}",
                    bucket, e.getMessage());
        }
    }

    private void createBucket() {
        try {
            if (DEFAULT_REGION.equals(region)) {
                s3Client.createBucket(b -> b.bucket(bucket));
            } else {
                // AWS ต้องระบุ region ของ bucket ถ้าไม่ใช่ us-east-1
                s3Client.createBucket(b -> b.bucket(bucket)
                        .createBucketConfiguration(c -> c.locationConstraint(region)));
            }
            log.info("Storage: created bucket '{}'", bucket);
        } catch (SdkException e) {
            log.warn("Storage: could not create bucket '{}': {}", bucket, e.getMessage());
        }
    }

    // =====================================================
    // อัปโหลด / ลบ / URL
    // =====================================================
    public void upload(String key, byte[] content, String contentType) {
        s3Client.putObject(
                b -> b.bucket(bucket).key(key).contentType(contentType).contentLength((long) content.length),
                RequestBody.fromBytes(content)
        );
    }

    public void delete(String key) {
        s3Client.deleteObject(b -> b.bucket(bucket).key(key));
    }

    // URL อายุสั้นสำหรับให้ browser โหลดรูปจาก bucket แบบ private (ไม่มีการเรียก network ตอนสร้าง)
    public String presignedGetUrl(String key) {
        return s3Presigner.presignGetObject(r -> r
                        .signatureDuration(urlExpiry)
                        .getObjectRequest(g -> g.bucket(bucket).key(key)))
                .url()
                .toString();
    }
}
