package com.bidflow.backend.entity;

import jakarta.persistence.*;          // annotation หลักของ JPA
import lombok.*;                       // @Getter @Setter etc.
import java.math.BigDecimal;           // type สำหรับเงิน (ไม่ใช้ double!)
import java.time.OffsetDateTime;       // type สำหรับ timestamp + timezone

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity                                // บอก Hibernate ว่า "นี่คือ table"
@Table(name = "users")                 // ชื่อ table จริงใน DB (เพราะ class = User แต่ table = users)
@Getter                                // Lombok: สร้าง getter ให้ทุก field อัตโนมัติ
@Setter                                // สร้าง setter
@NoArgsConstructor                     // constructor ว่าง (JPA ต้องใช้)
@AllArgsConstructor                    // constructor ใส่ทุก field
@Builder                               // ช่วยสร้าง object แบบอ่านง่าย

public class User {

	@Id                                                          // primary key
	@GeneratedValue(strategy = GenerationType.IDENTITY)          // ให้ DB auto-increment (BIGSERIAL)
	private Long id;

	@Column(name = "username", nullable = false, unique = true, length = 50)
	private String username;

	@Column(name = "email", nullable = false, unique = true, length = 100)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 255)
	private String passwordHash;
	// camelCase ใน Java — Hibernate แปลง _ → ตัวใหญ่ให้

	@Column(name = "full_name", nullable = false, length = 100)
	private String fullName;

	@Column(name = "wallet_balance", nullable = false, precision = 15, scale = 2) // หลักรวม, ทศนิยม (เท่ากับ DECIMAL(15,2))
	private BigDecimal walletBalance;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	/*
	หากในอนาคตต้องการให้ Spring Data JPA เป็นคนบันทึกเวลา createdAt และ updatedAt เองอัตโนมัติ (ไม่ต้องพึ่ง DB Default)
	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at")
	private OffsetDateTime updatedAt;
	*/
}