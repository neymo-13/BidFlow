package com.bidflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ไม่ซ้ำแบบไม่สนตัวพิมพ์ (unique index บน LOWER(name))
    @Column(name = "name", nullable = false, length = 50)
    private String name;

    // ใช้ใน URL — สร้างครั้งเดียวตอนเพิ่มหมวด ไม่เปลี่ยนตามการแก้ชื่อ
    @Column(name = "slug", nullable = false, unique = true, length = 60)
    private String slug;

    // false = ซ่อน: เลือกให้ auction ใหม่ไม่ได้ และไม่แสดงในตัวกรอง
    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
