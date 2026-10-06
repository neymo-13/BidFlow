package com.bidflow.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

// Object storage (AWS S3 หรือ storage ที่เข้ากันได้กับ S3 เช่น s3mock / MinIO)
// ค่าทั้งหมดมาจาก env ผ่าน application.yaml — ไม่มี credentials ในโค้ด
@Configuration
public class StorageConfig {

    @Value("${app.storage.region}")
    private String region;

    // ว่าง = AWS S3 จริง
    @Value("${app.storage.endpoint:}")
    private String endpoint;

    // host ที่ browser ใช้เปิด presigned URL (ว่าง = ใช้ endpoint)
    @Value("${app.storage.public-endpoint:}")
    private String publicEndpoint;

    // ว่าง = ใช้ AWS default credentials chain (env ของ AWS, IAM role ฯลฯ)
    @Value("${app.storage.access-key:}")
    private String accessKey;

    @Value("${app.storage.secret-key:}")
    private String secretKey;

    @Value("${app.storage.path-style:false}")
    private boolean pathStyle;

    @Bean
    public S3Client s3Client() {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider())
                .forcePathStyle(pathStyle);

        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint))
                    // storage ที่ไม่ใช่ AWS บางตัวไม่รองรับ checksum แบบใหม่ที่ SDK ส่งเป็นค่าเริ่มต้น
                    .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                    .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED);
        }
        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        S3Presigner.Builder builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyle)
                        .build());

        String urlEndpoint = !publicEndpoint.isBlank() ? publicEndpoint : endpoint;
        if (!urlEndpoint.isBlank()) {
            builder.endpointOverride(URI.create(urlEndpoint));
        }
        return builder.build();
    }

    private AwsCredentialsProvider credentialsProvider() {
        if (!accessKey.isBlank() && !secretKey.isBlank()) {
            return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
        }
        return DefaultCredentialsProvider.builder().build();
    }
}
