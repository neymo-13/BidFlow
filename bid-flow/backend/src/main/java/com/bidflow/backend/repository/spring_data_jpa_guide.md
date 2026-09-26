# สรุปการทำงานของ Spring Data JPA Repository

ใน Spring Boot เราถึงเขียนแค่ **Interface** โดยไม่ต้องลงมือเขียนคำสั่ง SQL หรือโค้ดเชื่อมต่อฐานข้อมูลเองเลย

ไฟล์นี้จะอธิบายหลักการทำงานและเบื้องหลังของ **Spring Data JPA** จากโค้ดใน `/backend/src/main/java/com/bidflow/backend/repository`

---

## 1. วิเคราะห์โค้ดตัวอย่าง

### 1.1 `UserRepository`

```java
package com.bidflow.backend.repository;

import com.bidflow.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}
```

* **`extends JpaRepository<User, Long>`**
  * ทำให้ได้เมธอดพื้นฐานสำหรับจัดการข้อมูล (**CRUD Operations**) มาทันทีโดยไม่ต้องเขียนเพิ่ม เช่น:
    * `save(S entity)` : สำหรับบันทึกหรืออัปเดตข้อมูล
    * `findById(ID id)` : ค้นหาตาม Primary Key
    * `findAll()` : ดึงข้อมูลทั้งหมดในตาราง
    * `deleteById(ID id)` : ลบข้อมูลตาม ID
* **`findByUsername(String username)`**
  * Spring แปลงเป็น SQL: `SELECT * FROM users WHERE username = ?`
* **`findByEmail(String email)`**
  * Spring แปลงเป็น SQL: `SELECT * FROM users WHERE email = ?`
* **`existsByUsername(String username)`**
  * Spring แปลงเป็น SQL เพื่อเช็คว่ามีข้อมูลหรือไม่ คืนค่าเป็น `true` / `false`

---

### 1.2 `WalletTransactionRepository`

```java
package com.bidflow.backend.repository;

import com.bidflow.backend.entity.WalletTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    // ดึงประวัติ tx ของ user แบบแบ่งหน้า เรียงจากใหม่สุด
    Page<WalletTransaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
```

* **`findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable)`**
  * **`findByUserId`** : ค้นหาข้อมูลในตาราง `wallet_transaction` ที่ฟิลด์ `user_id` เท่ากับค่าที่ส่งเข้ามา
  * **`OrderByCreatedAtDesc`** : เรียงลำดับตามฟิลด์ `created_at` จากใหม่ไปเก่า (Descending)
  * **`Pageable`** : รองรับการทำ **Pagination** (แบ่งหน้า) โดย Spring จะช่วยจัดการเรื่อง `LIMIT` และ `OFFSET` ให้โดยอัตโนมัติ

---

## 2. เบื้องหลังการทำงาน (How It Works Behind the Scenes)

สิ่งที่ทำให้เราไม่ต้องเขียนคำสั่ง SQL หรือ Implement Class เอง มีหลักการสำคัญ 3 ข้อดังนี้:

### 1. Derived Query Methods (การแกะคำสั่งจากชื่อเมธอด)
Spring Data JPA มีตัว **Query Parser** ที่จะคอยอ่านชื่อเมธอดที่เราตั้งขึ้น โดยยึดตามโครงสร้างกติกา เช่น:
$$\text{Action} + \text{By} + \text{PropertyName} + \text{Condition}$$

* **Action**: `find`, `read`, `get`, `count`, `exists`, `delete`
* **PropertyName**: ชื่อฟิลด์ที่อยู่ใน Entity Class เช่น `Username`, `Email`, `UserId`
* **Condition / Order**: `And`, `Or`, `Between`, `LessThan`, `OrderBy...Desc`

เมื่อแอปพลิเคชันเริ่มทำงาน (Startup) Spring จะวิเคราะห์ชื่อเมธอดเหล่านี้ แล้วแปลงให้เป็นคำสั่ง **JPQL (Java Persistence Query Language)** และส่งต่อให้ Database Driver แปลงเป็น **SQL** ของฐานข้อมูลนั้นๆ อีกที

---

### 2. Spring Dynamic Proxy
เนื่องจาก Repository ถูกประกาศเป็นเพียง `interface` ในช่วงรันไทม์ (Runtime) Spring จะใช้เทคนิค **Dynamic Proxy** สร้าง **Implementation Class** ขึ้นมาในหน่วยความจำโดยอัตโนมัติ และฉีด (Inject) โค้ดการทำงานที่เชื่อมต่อกับฐานข้อมูลเข้าไปให้เราใช้งานทันที

---

### 3. Object-Relational Mapping (ORM / Hibernate)
Spring Data JPA ทำงานอยู่บน **JPA (Java Persistence API)** โดยมี **Hibernate** เป็นตัวขับเคลื่อนอยู่เบื้องหลัง ทำหน้าที่:
* แปลงข้อมูลจากแถวใน SQL Table ให้กลับมาอยู่ในรูปแบบ **Java Object** (เช่น `User` หรือ `Page<WalletTransaction>`)
* จัดการเรื่อง Data Types และ Data Structures ต่างๆ (เช่น การห่อด้วย `Optional<T>` เพื่อป้องกันปัญหา `NullPointerException`)

---

## 3. สรุปข้อดี
1. **ลดโค้ดที่ซ้ำซ้อน (Boilerplate Code)** : ไม่ต้องเปิด/ปิด Connection หรือเขียน SQL พ้นฐานด้วยตัวเอง
2. **โค้ดอ่านง่าย (Clean & Readable)** : ชื่อเมธอดสื่อความหมายชัดเจนว่าทำอะไร
3. **ลดข้อผิดพลาด** : ป้องกันปัญหาการพิมพ์ SQL คำสั่งผิด (Syntax Error) เพราะ Spring ช่วยตรวจสอบโครงสร้างฟิลด์ให้อยู่แล้วตั้งแต่ตอนเริ่มต้นแอปพลิเคชัน