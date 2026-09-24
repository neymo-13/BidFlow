เยี่ยม! 🔥 Step 2.4 — `WalletService` — หัวใจของ Phase 2

---

## 🎓 Concept สั้น ๆ (อ่าน 1 นาที)

**WalletService มีหน้าที่:**
1. รับคำสั่งจาก Controller (deposit/withdraw)
2. ตรวจสอบ business logic (เช่น เงินพอไหม)
3. อัปเดต **2 ที่พร้อมกัน**: `users.wallet_balance` + `wallet_transactions` (ledger)
4. ถ้าขั้นตอนใดพลาด → **rollback ทั้งหมด** (thanks to `@Transactional`)

**3 annotations ที่ต้องรู้:**

| Annotation | ทำอะไร |
|---|---|
| `@Service` | บอก Spring ว่า "นี่คือ service bean" |
| `@RequiredArgsConstructor` | Lombok สร้าง constructor ที่รับ dependency ทั้งหมด |
| `@Transactional` | ถ้า method นี้ error → ย้อนทุก DB change กลับ |

---

## 📄 ไฟล์ `service/WalletService.java`

สร้างโฟลเดอร์ `service/` แล้วสร้างไฟล์:

```java
package com.bidflow.backend.service;

import com.bidflow.backend.dto.WalletResponse;
import com.bidflow.backend.dto.WalletTransactionResponse;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.entity.WalletTransaction;
import com.bidflow.backend.entity.enums.TransactionType;
import com.bidflow.backend.exception.InsufficientBalanceException;
import com.bidflow.backend.exception.UserNotFoundException;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final UserRepository userRepository;
    private final WalletTransactionRepository walletTransactionRepository;

    // =====================================================
    // 1. ดูยอดเงินใน wallet
    // =====================================================
    @Transactional(readOnly = true)
    public WalletResponse getWallet(Long userId) {
        User user = findUser(userId);
        return new WalletResponse(
                user.getId(),
                user.getUsername(),
                user.getWalletBalance()
        );
    }

    // =====================================================
    // 2. ฝากเงิน
    // =====================================================
    @Transactional
    public WalletTransactionResponse deposit(Long userId, BigDecimal amount) {
        User user = findUser(userId);

        // 1) อัปเดตยอดเงิน
        BigDecimal newBalance = user.getWalletBalance().add(amount);
        user.setWalletBalance(newBalance);

        // 2) บันทึก ledger
        WalletTransaction tx = WalletTransaction.builder()
                .user(user)
                .amount(amount)
                .balanceAfter(newBalance)
                .type(TransactionType.DEPOSIT)
                .description("Deposit " + amount)
                .build();

        walletTransactionRepository.save(tx);
        userRepository.save(user);

        return toResponse(tx);
    }

    // =====================================================
    // 3. ถอนเงิน
    // =====================================================
    @Transactional
    public WalletTransactionResponse withdraw(Long userId, BigDecimal amount) {
        User user = findUser(userId);

        // 1) เช็คยอดเงิน
        if (user.getWalletBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    userId,
                    user.getWalletBalance(),
                    amount
            );
        }

        // 2) อัปเดตยอดเงิน
        BigDecimal newBalance = user.getWalletBalance().subtract(amount);
        user.setWalletBalance(newBalance);

        // 3) บันทึก ledger
        WalletTransaction tx = WalletTransaction.builder()
                .user(user)
                .amount(amount.negate())     // ← ติดลบ เพราะเงินออก
                .balanceAfter(newBalance)
                .type(TransactionType.WITHDRAW)
                .description("Withdraw " + amount)
                .build();

        walletTransactionRepository.save(tx);
        userRepository.save(user);

        return toResponse(tx);
    }

    // =====================================================
    // 4. ดูประวัติ transaction (paged)
    // =====================================================
    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> getTransactions(Long userId, int page, int size) {
        // เช็คว่า user มีจริง
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException(userId);
        }

        Pageable pageable = PageRequest.of(page, size);
        return walletTransactionRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    // =====================================================
    // Helper methods
    // =====================================================

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    private WalletTransactionResponse toResponse(WalletTransaction tx) {
        return new WalletTransactionResponse(
                tx.getId(),
                tx.getType(),
                tx.getAmount(),
                tx.getBalanceAfter(),
                tx.getReferenceType(),
                tx.getReferenceId(),
                tx.getDescription(),
                tx.getCreatedAt()
        );
    }
}
```

---

## 🧠 อธิบายจุดสำคัญ

### 1. `@RequiredArgsConstructor` — Dependency Injection

```java
@Service
@RequiredArgsConstructor
public class WalletService {
    private final UserRepository userRepository;              // ← final
    private final WalletTransactionRepository walletTransactionRepository;
}
```

**Lombok generate ให้:**
```java
public WalletService(UserRepository ur, WalletTransactionRepository wr) {
    this.userRepository = ur;
    this.walletTransactionRepository = wr;
}
```

**Spring ฉีด (inject) ให้อัตโนมัติ** — เราไม่ต้อง `new` เอง

**ทำไมต้อง `final`?**
- มั่นใจว่า dependency ถูก inject ตอนสร้าง object
- เป็น **constructor injection** ซึ่งเป็น best practice (ดีกว่า field injection)

### 2. `@Transactional` — หัวใจของ atomicity

```java
@Transactional
public WalletTransactionResponse deposit(Long userId, BigDecimal amount) {
    user.setWalletBalance(newBalance);
    walletTransactionRepository.save(tx);   // ← ถ้าตรงนี้ error
    userRepository.save(user);              // ← ตรงนี้จะไม่ save
}
```

**ถ้า method นี้ throw error** → ทุก DB change ที่ทำใน method นี้จะ **rollback ทั้งหมด**

**สถานการณ์จริง:**
- Save `WalletTransaction` สำเร็จ ✅
- Save `User` fail ❌ (เช่น DB connection หลุด)
- → Spring rollback **ทั้งคู่** → ข้อมูลไม่เสียหาย

**นี่คือเหตุผลที่ Wallet + Ledger ต้องอยู่ใน transaction เดียวกัน**

### 3. `@Transactional(readOnly = true)`

Method ที่แค่อ่าน → ใส่ `readOnly = true`:
- Hibernate จะ optimize ให้ (ไม่ track dirty state)
- เร็วขึ้นเล็กน้อย
- ปลอดภัยกว่า (เผลอ modify ไม่ได้)

### 4. `BigDecimal.compareTo()` — อย่าใช้ `>`

```java
// ❌ ผิด — เทียบ object reference ไม่ใช่ค่า
if (user.getWalletBalance() > amount) { }

// ✅ ถูก
if (user.getWalletBalance().compareTo(amount) < 0) {
    // balance < amount → เงินไม่พอ
}
```

**เหตุผล:** `BigDecimal` เป็น object — ต้องใช้ `compareTo()` เท่านั้น

**ผลลัพธ์ของ compareTo:**
| Return | หมายถึง |
|---|---|
| `-1` (ลบ) | ตัวแรก < ตัวหลัง |
| `0` | เท่ากัน |
| `1` (บวก) | ตัวแรก > ตัวหลัง |

### 5. `amount.negate()` — พลิกเครื่องหมาย

```java
amount = new BigDecimal("1000.00");
amount.negate();   // = -1000.00
```

ใช้ตอน withdraw → amount ใน ledger ติดลบ (เพราะเงินออก)

### 6. `.map(this::toResponse)` — Method Reference

```java
Page<WalletTransaction> entityPage = ...;
Page<WalletTransactionResponse> responsePage = entityPage.map(this::toResponse);
```

**`this::toResponse`** = "เรียก method `toResponse` ของ `this` object กับทุก element"

เหมือนเขียน:
```java
.map(tx -> this.toResponse(tx))
```

### 7. Pattern "check then throw"

```java
private User findUser(Long userId) {
    return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
}
```

- ถ้าเจอ user → คืน `User`
- ถ้าไม่เจอ → throw `UserNotFoundException`
- ใช้ซ้ำได้ทุก method — DRY (Don't Repeat Yourself)

---

## ✅ ทดสอบ

```powershell
.\mvnw spring-boot:run
```

**ต้องผ่าน** — ถ้า error ดูที่:
- Import ผิด (โดยเฉพาะ `jakarta.transaction` vs `org.springframework.transaction` ← ต้องใช้ **springframework**)
- Lombok ไม่ generate constructor (check IDE plugin)

---

## 📁 โครงสร้างปัจจุบัน

```
com.bidflow.backend/
├── entity/         ✅ 6 entities
├── enums/          ✅ 3 enums
├── repository/     ✅ 2 repositories
├── dto/            ✅ 4 DTOs
├── exception/      ✅ 2 exceptions
└── service/        ✅ 1 service (ใหม่)
```

**Phase 2 ทำไปแล้ว 4/6:**
- ✅ 2.1 Repository
- ✅ 2.2 DTO
- ✅ 2.3 Exceptions
- ✅ 2.4 **WalletService** ← เสร็จ!
- ⏳ 2.5 WalletController ← ต่อไป
- ⏳ 2.6 GlobalExceptionHandler

---

## 💡 เกร็ด — ทำไมต้อง `save(user)` หลัง `setWalletBalance()`?

Hibernate ใช้ **dirty checking**:
- เมื่อ `user` อยู่ใน **managed state** (โหลดมาจาก repository) → Hibernate track การเปลี่ยนแปลง
- พอ transaction commit → Hibernate จะ `UPDATE users SET wallet_balance = ?` ให้อัตโนมัติ
- **ไม่ต้อง `save(user)`** ก็ได้!

แต่พี่ใส่ `userRepository.save(user)` ไว้เพื่อ **ความชัดเจน** (เผื่อคนอ่าน code)  
จริง ๆ แล้ว optional — ถ้าลบออกก็ยังทำงานได้

**ทดสอบ:** ลองลบ `userRepository.save(user)` ออก → ควรยังทำงานได้ปกติ

---

## 🎯 Preview Step 2.5

WalletController จะสั้นมาก — แค่:
```java
@PostMapping("/{userId}/deposit")
public WalletTransactionResponse deposit(
        @PathVariable Long userId,
        @Valid @RequestBody DepositRequest req) {
    return walletService.deposit(userId, req.amount());
}
```

**แค่ 5 บรรทัด** — เพราะ logic อยู่ใน Service แล้ว

---

## 📤 ส่งกลับมา

1. **ผ่าน** `.\mvnw spring-boot:run` ไหม
2. **คำถาม** — ถ้ามีตรงไหนยังไม่ clear
3. **พร้อมไป 2.5** (Controller) ไหม

---

**ทำได้!** 💪 ครึ่งทางของ Phase 2 แล้ว