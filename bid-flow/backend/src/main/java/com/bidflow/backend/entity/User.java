package com.bidflow.backend.entity;

import com.bidflow.backend.enums.Role;
import jakarta.persistence.*;          // annotation หลักของ JPA
import lombok.*;                       // @Getter @Setter etc.
import java.math.BigDecimal;           // type สำหรับเงิน (ไม่ใช้ double!)
import java.time.OffsetDateTime;       // type สำหรับ timestamp + timezone
import java.util.Collection;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity                                // บอก Hibernate ว่า "นี่คือ table"
@Table(name = "users")                 // ชื่อ table จริงใน DB (เพราะ class = User แต่ table = users)
@Getter                                // Lombok: สร้าง getter ให้ทุก field อัตโนมัติ
@Setter                                // สร้าง setter
@NoArgsConstructor                     // constructor ว่าง (JPA ต้องใช้)
@AllArgsConstructor                    // constructor ใส่ทุก field
@Builder                               // ช่วยสร้าง object แบบอ่านง่าย

public class User implements UserDetails {

	@Id                                                          // primary key
	@GeneratedValue(strategy = GenerationType.IDENTITY)          // ให้ DB auto-increment (BIGSERIAL)
	private Long id;

	@Column(name = "username", nullable = false, unique = true, length = 50)
	private String username;

	@Column(name = "email", nullable = false, unique = true, length = 100)
	private String email;

	// null = บัญชีที่สมัครผ่าน Google (ไม่มีรหัสผ่าน)
	@Column(name = "password_hash", length = 255)
	private String passwordHash;
	// camelCase ใน Java — Hibernate แปลง _ → ตัวใหญ่ให้

	@Column(name = "full_name", nullable = false, length = 100)
	private String fullName;

	@Column(name = "wallet_balance", nullable = false, precision = 15, scale = 2) // หลักรวม, ทศนิยม (เท่ากับ DECIMAL(15,2))
	private BigDecimal walletBalance;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false, length = 20)
	@Builder.Default
	private Role role = Role.USER;

	// ถูกระงับโดย admin → login / ใช้ token เดิมไม่ได้
	@Column(name = "suspended", nullable = false)
	@Builder.Default
	private boolean suspended = false;

	// Google "sub" (รหัสผู้ใช้ถาวรของ Google) — null = ยังไม่เคยเชื่อม Google
	@Column(name = "google_sub", unique = true, length = 255)
	private String googleSub;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	@Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    
    @Override
    public String getPassword() { return passwordHash; }
    
    @Override
    public String getUsername() { return username; }
    
    @Override
    public boolean isAccountNonExpired() { return true; }
    @Override
    public boolean isAccountNonLocked() { return true; }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() { return true; }
}