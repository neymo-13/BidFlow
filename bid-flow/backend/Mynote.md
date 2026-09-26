📝 **จัดให้!** — README แบบ production-grade

**หมายเหตุ:** พี่เขียนให้ทั้ง **ภาษาไทย + อังกฤษ** ผสมกัน (technical terms เป็นอังกฤษ) เพื่อให้อ่านง่าย

---

# 📄 `backend/README.md`

```markdown
# 🎯 BidFlow Backend

> Real-time auction platform backend with distributed locking, 
> JWT authentication, and automated settlement.

[![Java](https://img.shields.io/badge/Java-21-orange)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-brightgreen)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://www.docker.com/)

---

## 📖 สารบัญ

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Concurrency Control](#-concurrency-control)
- [Testing](#-testing)
- [Docker Deployment](#-docker-deployment)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)

---

## 🎯 Overview

**BidFlow** คือระบบประมูลแบบ real-time ที่รองรับ:
- **Concurrent Bidding** — หลาย user bid พร้อมกันได้อย่างปลอดภัย
- **Distributed Lock** — ใช้ Redisson + Redis สำหรับ cross-instance locking
- **Automated Settlement** — Scheduler ปิดประมูล + โอนเงินอัตโนมัติ
- **Real-time Updates** — WebSocket broadcast ทันทีเมื่อมี bid ใหม่
- **Virtual Wallet** — ระบบกระเป๋าเงินจำลองพร้อม ledger

### 🎓 Project Context

โปรเจกต์นี้พัฒนาขึ้นเพื่อ:
- เรียนรู้ Spring Boot + Spring Security + JPA
- ทดสอบ Distributed Locking patterns
- ฝึก Concurrency Control ในระดับ production
- Demo Integration Testing

---

## ✨ Features

### 🔐 Authentication & Authorization
- User registration + login
- JWT-based authentication (stateless)
- BCrypt password hashing
- Role-based access (ready for expansion)

### 💰 Virtual Wallet
- Deposit / Withdraw
- **Ledger pattern** — ทุก transaction ถูกบันทึก
- Balance hold/release สำหรับ bidding
- Transaction history (paged)
- **IDOR protection** — ใช้ `/me` endpoints

### 🏷️ Auction Management
- Create / Read / Update / Cancel
- Ownership check (เฉพาะเจ้าของ)
- Status lifecycle: `DRAFT` → `ACTIVE` → `ENDED` / `CANCELLED`
- Pagination + filter by status

### ⚡ Concurrent Bidding
- **Redisson distributed lock** per auction
- Transaction commit ก่อนปลด lock
- Wallet hold/release
- Bid validation 6 ข้อ
- Sequential bid sequence (unique constraint)
- **Optimistic Locking** (`@Version`) เป็น safety net

### 🌐 Real-time
- WebSocket STOMP protocol
- Broadcast `BID_PLACED` / `AUCTION_ENDED` events
- Subscribe per-auction (`/topic/auctions/{id}`)

### ⏰ Automated Settlement
- `@Scheduled` ทุก 30 วินาที
- หา auction ที่หมดเวลา
- ตั้ง winner + status = ENDED
- โอนเงิน winner → seller
- สร้าง notifications
- **Idempotency** — settle ซ้ำไม่ได้

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Language** | Java | 21 (LTS) |
| **Framework** | Spring Boot | 4.1.1 |
| **Web** | Spring Web MVC | 7.0.9 |
| **Security** | Spring Security + JJWT | 7.1.1 / 0.12.6 |
| **ORM** | Spring Data JPA + Hibernate | 4.1.1 / 7.4.5 |
| **Database** | PostgreSQL | 16 |
| **Cache/Lock** | Redis + Redisson | 7 / 3.34.1 |
| **WebSocket** | STOMP over WebSocket | - |
| **Build** | Maven | 3.9 |
| **Container** | Docker + Docker Compose | - |
| **Testing** | JUnit 5 + AssertJ | - |

---

## 🏗 Architecture

### High-Level

```
┌──────────────────────────────────────────────────────────┐
│  Client (Postman / Frontend)                             │
└───────────────────┬──────────────────────────────────────┘
                    │ HTTP / WebSocket
                    ▼
┌──────────────────────────────────────────────────────────┐
│  Spring Boot (Port 8080)                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Controller Layer                                  │  │
│  │    AuthController, AuctionController, ...          │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Service Layer                                     │  │
│  │    AuthService, WalletService, BidService, ...     │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Repository Layer (Spring Data JPA)                │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Security (JWT Filter + BCrypt)                    │  │
│  └────────────────────────────────────────────────────┘  │
└─────────┬──────────────────────────┬─────────────────────┘
          │                          │
          ▼                          ▼
    ┌──────────┐              ┌──────────┐
    │PostgreSQL│              │  Redis   │
    │  :5432   │              │  :6379   │
    └──────────┘              └──────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Controller** | HTTP mapping, validation, DTO conversion |
| **Service** | Business logic, transaction boundary |
| **Repository** | Data access (Spring Data JPA) |
| **Entity** | JPA mappings |
| **DTO** | Request/Response contracts |
| **Exception** | Global exception handling |

---

## 🚀 Quick Start

### Prerequisites

- **Java 21** ([Temurin](https://adoptium.net/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Maven Wrapper** (มีในโปรเจกต์แล้ว)

### 1️⃣ Clone repository

```bash
git clone <your-repo-url>
cd bid-flow
```

### 2️⃣ Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d postgres-db redis
```

ตรวจสอบ:
```bash
docker compose ps
# ควรเห็น auction-postgres และ auction-redis สถานะ Up (healthy)
```

### 3️⃣ Run backend (dev mode)

```bash
cd backend
./mvnw spring-boot:run
```

**Windows (PowerShell):**
```powershell
cd backend
.\mvnw spring-boot:run
```

**คาดหวัง:**
```
Tomcat started on port 8080 (http)
Started BackendApplication in X seconds
```

### 4️⃣ Test

```bash
curl http://localhost:8080/api/auctions
```

---

## ⚙️ Environment Variables

### Local Development (`application.yaml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/auction_db
    username: postgres
    password: postgres

  data:
    redis:
      host: localhost
      port: 6379

app:
  jwt:
    secret: <base64-encoded-secret>
    expiration-ms: 86400000    # 24 hours
```

### Docker Profile (`application-docker.yaml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://postgres-db:5432/auction_db

  data:
    redis:
      host: redis
```

### Production (Recommended)

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<db>
export SPRING_DATASOURCE_USERNAME=<user>
export SPRING_DATASOURCE_PASSWORD=<password>
export SPRING_DATA_REDIS_HOST=<redis-host>
export APP_JWT_SECRET=<strong-secret>
```

> ⚠️ **Security:** **ห้าม** commit secret จริงลง Git — ใช้ environment variables เสมอ

---

## 📡 API Documentation

**Base URL:** `http://localhost:8080`

### 🔐 Authentication

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "password123",
  "fullName": "Alice Wonder"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "userId": 1,
  "username": "alice",
  "email": "alice@example.com",
  "fullName": "Alice Wonder"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "password123"
}
```

**Response (200):** เหมือน register

#### Get Current User

```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "fullName": "Alice Wonder",
  "walletBalance": 10000.00,
  "createdAt": "2026-09-25T..."
}
```

---

### 💰 Wallet

#### Get My Wallet

```http
GET /api/wallet/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "userId": 1,
  "username": "alice",
  "balance": 15000.00
}
```

#### Deposit

```http
POST /api/wallet/me/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000
}
```

**Response (201):**
```json
{
  "id": 1,
  "type": "DEPOSIT",
  "amount": 5000.00,
  "balanceAfter": 15000.00,
  "createdAt": "..."
}
```

#### Withdraw

```http
POST /api/wallet/me/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000
}
```

#### Transaction History

```http
GET /api/wallet/me/transactions?page=0&size=20
Authorization: Bearer <token>
```

---

### 🏷️ Auctions

#### List Auctions (Public)

```http
GET /api/auctions?status=ACTIVE&page=0&size=20
```

**Response (200):** Page of `AuctionSummaryResponse`

#### Get Auction Detail (Public)

```http
GET /api/auctions/{id}
```

#### Create Auction

```http
POST /api/auctions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "iPhone 15 Pro",
  "description": "Brand new, sealed",
  "startPrice": 30000,
  "minIncrement": 500,
  "startTime": "2026-10-01T10:00:00+07:00",
  "endTime": "2026-10-07T10:00:00+07:00"
}
```

**Response (201):** `AuctionResponse`

#### Update Auction (Owner only, DRAFT only)

```http
PUT /api/auctions/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "iPhone 15 Pro Max",
  "startPrice": 35000
}
```

#### Cancel Auction (Owner only)

```http
DELETE /api/auctions/{id}
Authorization: Bearer <token>
```

**Response:** `204 No Content`

#### My Auctions

```http
GET /api/auctions/my?page=0&size=20
Authorization: Bearer <token>
```

---

### ⚡ Bids

#### Place Bid

```http
POST /api/auctions/{id}/bids
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 31000
}
```

**Response (201):**
```json
{
  "id": 1,
  "auctionItemId": 1,
  "bidderId": 2,
  "bidderUsername": "charlie",
  "bidAmount": 31000.00,
  "bidSequence": 1,
  "createdAt": "2026-09-25T..."
}
```

**Validation rules:**
1. Auction ต้อง `ACTIVE`
2. ต้องอยู่ระหว่าง `startTime` - `endTime`
3. Bidder ต้องไม่ใช่ seller
4. `amount >= currentPrice + minIncrement`
5. Bidder ต้องมีเงินพอ (hold)
6. Redisson lock ป้องกัน concurrent

#### Get Bid History (Public)

```http
GET /api/auctions/{id}/bids?page=0&size=20
```

---

### 🔔 Notifications

#### Get My Notifications

```http
GET /api/notifications?page=0&size=20
Authorization: Bearer <token>
```

#### Mark as Read

```http
PUT /api/notifications/{id}/read
Authorization: Bearer <token>
```

---

### 🌐 WebSocket

**Endpoint:** `ws://localhost:8080/ws`

**Subscribe:**
```
SUBSCRIBE
id:sub-1
destination:/topic/auctions/{auctionId}
```

**Events:**

**BID_PLACED:**
```json
{
  "type": "BID_PLACED",
  "auctionId": 1,
  "bidId": 11,
  "bidderId": 4,
  "bidderUsername": "charlie",
  "amount": 40500.00,
  "sequence": 11,
  "currentPrice": 40500.00,
  "timestamp": "2026-09-25T..."
}
```

**AUCTION_ENDED:**
```json
{
  "type": "AUCTION_ENDED",
  "auctionId": 1,
  "bidderUsername": "charlie",
  "amount": 40500.00,
  ...
}
```

---

## 🗄 Database Schema

### Tables

| Table | Purpose |
|---|---|
| `users` | User accounts + wallet balance |
| `auction_items` | Auction listings |
| `item_images` | S3 object keys |
| `bids` | Bid history |
| `wallet_transactions` | Ledger |
| `notifications` | User notifications |

### Key Constraints

**users:**
```sql
wallet_balance DECIMAL(15,2) CHECK (wallet_balance >= 0)
```

**auction_items:**
```sql
status VARCHAR(20) CHECK (status IN ('DRAFT','ACTIVE','ENDED','CANCELLED'))
end_time > start_time
version BIGINT  -- Optimistic Locking
```

**bids:**
```sql
UNIQUE (auction_item_id, bid_sequence)
bid_amount > 0
```

**wallet_transactions:**
```sql
amount <> 0
balance_after >= 0
type IN ('DEPOSIT','WITHDRAW','BID_HOLD','BID_RELEASE','WIN_PAYMENT','SELLER_PAYOUT')
```

### Indexes

```sql
idx_auction_status_endtime    ON auction_items(status, end_time)
idx_auction_seller            ON auction_items(seller_id)
idx_bids_item_created         ON bids(auction_item_id, created_at)
idx_bids_item_amount          ON bids(auction_item_id, bid_amount DESC)
idx_notifications_user_read   ON notifications(user_id, is_read, created_at)
idx_wallet_tx_user_created    ON wallet_transactions(user_id, created_at DESC)
```

---

## 🔒 Concurrency Control

### Problem

```
T=0ms:  User A bid 31000
T=0ms:  User B bid 31000
        ↓
   ถ้าไม่มี lock:
   - ทั้งคู่ผ่าน validation
   - current_price เพี้ยน
   - bid_sequence ซ้ำ → constraint violation
```

### Solution: Redisson Lock + Optimistic Lock

```java
RLock lock = redissonClient.getLock("auction:bid:" + auctionId);
lock.tryLock(3, TimeUnit.SECONDS);

try {
    transactionTemplate.execute(status -> {
        // 1. Load auction
        // 2. Validate (status, time, self-bid, price)
        // 3. Release previous bidder's hold
        // 4. Hold new bidder's money
        // 5. Save bid
        // 6. Update auction
        // 7. Broadcast event
        return response;
    });
} finally {
    lock.unlock();
}
```

**Protection layers:**

1. **Redisson Lock** — serialize requests ต่อ auction
2. **TransactionTemplate** — atomic commit ก่อนปลด lock
3. **`@Version` Optimistic Lock** — safety net ถ้า lock fail
4. **DB Constraints** — `UNIQUE`, `CHECK`, `NOT NULL`

### Wallet Hold/Release Flow

```
1. User A bid 31000:
   - wallet: 50000 → 19000
   - ledger: BID_HOLD -31000

2. User B bid 31500 (outbids A):
   - Release A: 19000 → 50000  (BID_RELEASE +31000)
   - Hold B: 50000 → 18500     (BID_HOLD -31500)

3. Auction end — B wins:
   - Seller receives: 31500    (SELLER_PAYOUT +31500)
   - B's hold converts to settled (no ledger entry)
```

---

## 🧪 Testing

### Run All Tests

```bash
cd backend
./mvnw test
```

### Run Specific Test

```bash
./mvnw test -Dtest=ConcurrentBiddingTest
```

### Test Coverage

**`ConcurrentBiddingTest`:**
- ✅ 10 threads bid same amount → only 1 succeeds
- ✅ 10 threads bid increasing amounts → sequential acceptance

**`SettlementTest`:**
- ✅ Normal settlement — winner receives money
- ✅ No bids → ENDED without winner
- ✅ Idempotency — settle twice doesn't double-pay

### Manual Test (Postman)

1. Register / Login → get token
2. Create auction → change status to ACTIVE (via SQL)
3. Deposit to wallet
4. Place bid → check WebSocket broadcast
5. Wait for scheduler → verify settlement

---

## 🐳 Docker Deployment

### Build & Run Full Stack

```bash
# Build backend image
docker compose build backend

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

### Services

| Service | Container | Port |
|---|---|---|
| Backend | `auction-backend` | 8080 |
| PostgreSQL | `auction-postgres` | 5432 |
| Redis | `auction-redis` | 6379 |

### Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=build /app/target/*.jar app.jar
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Image size:** ~180MB

### Reset Database

```bash
docker compose down -v   # ⚠️ ลบ volume — data หาย!
docker compose up -d
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/bidflow/backend/
│   │   │   ├── BackendApplication.java
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── RedissonConfig.java
│   │   │   │   └── WebSocketConfig.java
│   │   │   ├── security/
│   │   │   │   ├── JwtService.java
│   │   │   │   └── JwtAuthFilter.java
│   │   │   ├── entity/
│   │   │   │   ├── User.java
│   │   │   │   ├── AuctionItem.java
│   │   │   │   ├── Bid.java
│   │   │   │   ├── ItemImage.java
│   │   │   │   ├── Notification.java
│   │   │   │   └── WalletTransaction.java
│   │   │   ├── enums/
│   │   │   │   ├── AuctionStatus.java
│   │   │   │   ├── TransactionType.java
│   │   │   │   └── ReferenceType.java
│   │   │   ├── repository/
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── AuctionItemRepository.java
│   │   │   │   ├── BidRepository.java
│   │   │   │   ├── NotificationRepository.java
│   │   │   │   └── WalletTransactionRepository.java
│   │   │   ├── dto/
│   │   │   │   ├── RegisterRequest.java
│   │   │   │   ├── LoginRequest.java
│   │   │   │   ├── AuthResponse.java
│   │   │   │   ├── CreateAuctionRequest.java
│   │   │   │   ├── PlaceBidRequest.java
│   │   │   │   └── ...
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── WalletService.java
│   │   │   │   ├── AuctionService.java
│   │   │   │   ├── BidService.java
│   │   │   │   ├── BidEventPublisher.java
│   │   │   │   ├── NotificationService.java
│   │   │   │   ├── AuctionSettlementService.java
│   │   │   │   └── AuctionSettlementExecutor.java
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── UserController.java
│   │   │   │   ├── WalletController.java
│   │   │   │   ├── AuctionController.java
│   │   │   │   ├── BidController.java
│   │   │   │   └── NotificationController.java
│   │   │   └── exception/
│   │   │       ├── GlobalExceptionHandler.java
│   │   │       ├── ErrorResponse.java
│   │   │       ├── UserNotFoundException.java
│   │   │       └── InsufficientBalanceException.java
│   │   └── resources/
│   │       ├── application.yaml
│   │       └── application-docker.yaml
│   └── test/java/com/bidflow/backend/
│       ├── ConcurrentBiddingTest.java
│       └── SettlementTest.java
├── Dockerfile
├── .dockerignore
└── pom.xml
```

---

## 🚨 Troubleshooting

### ❌ `release version 21 not supported`

**สาเหตุ:** `JAVA_HOME` ชี้ JDK เก่า

**แก้:**
```powershell
# Windows
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.3.9-hotspot"
java -version   # ต้องขึ้น 21
```

### ❌ `password authentication failed for user "postgres"`

**สาเหตุ:** มี PostgreSQL local ยึด port 5432 อยู่

**แก้:**
```powershell
# Windows
Stop-Service postgresql-x64-16
Set-Service postgresql-x64-16 -StartupType Disabled

# เช็ค
netstat -ano | Select-String ":5432"
```

### ❌ `LazyInitializationException`

**สาเหตุ:** เข้าถึง lazy field นอก transaction

**แก้:** ใช้ `@Transactional` ใน Service method ที่โหลด entity

### ❌ `UnexpectedRollbackException`

**สาเหตุ:** Exception ใน `@Transactional` แต่ outer ไม่ handle

**แก้:** ตรวจ validation order — throw ก่อนเริ่ม DB write

### ❌ `found duplicate key data` (YAML)

**สาเหตุ:** Key ซ้ำใน `application.yaml`

**แก้:** รวม `data:` blocks เป็นตัวเดียว

### ❌ `The method X is undefined for the type Y`

**สาเหตุ:** Lombok ไม่ generate (IDE cache)

**แก้:**
```powershell
.\mvnw clean
.\mvnw spring-boot:run
```

### ❌ OneDrive lock — `Failed to delete target/`

**สาเหตุ:** OneDrive sync ขณะ build

**แก้:** ย้ายโปรเจกต์ออกจาก OneDrive:
```
C:\Users\<user>\OneDrive\...\BidFlow   ❌
C:\dev\BidFlow                         ✅
```

### ❌ `Self-invocation` — `@Transactional` ไม่ทำงาน

**สาเหตุ:** เรียก `@Transactional` method จาก method เดียวกันใน class

**แก้:** แยก Service (เช่น `AuctionSettlementExecutor`)

---

## 🗺 Roadmap

### ✅ Completed

- [x] Phase 0-1: Infrastructure + Entities
- [x] Phase 2: Wallet + Ledger
- [x] Phase 3: JWT Authentication
- [x] Phase 4: Auction CRUD
- [x] Phase 5: Concurrent Bidding + Redisson
- [x] Phase 6: WebSocket Real-time
- [x] Phase 7: Scheduler + Settlement
- [x] Phase 8: Integration Tests
- [x] Phase 9: Docker

### ⏳ Planned

- [ ] Phase 10: Frontend (Next.js)
- [ ] Phase 11: Image Upload (S3/MinIO)
- [ ] Phase 12: Google OAuth2
- [ ] Phase 13: Custom Lua Script + Outbox Pattern
- [ ] Phase 14: Kubernetes deployment
- [ ] Phase 15: Monitoring (Prometheus + Grafana)

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'feat: add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Open Pull Request

### Commit Convention

ใช้ [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance
- `docs:` — documentation
- `test:` — tests
- `refactor:` — code improvement

---

## 📄 License

MIT License — ดู [LICENSE](../LICENSE) สำหรับรายละเอียด

---

## 🙏 Acknowledgments

- Spring Boot Team
- Redisson contributors
- PostgreSQL / Redis communities

---

**Built with ❤️ for learning Spring Boot & Distributed Systems**
```

---

## 📤 วิธีใช้ README นี้

### 1. สร้างไฟล์ `backend/README.md`

**ใช้ VS Code:**
- คลิกขวาที่ folder `backend/`
- New File → `README.md`
- Paste เนื้อหาทั้งหมด

### 2. ปรับเปลี่ยนให้ตรงกับของเธอ

**จุดที่ต้องแก้:**
- `<your-repo-url>` → URL GitHub ของเธอ
- `<base64-encoded-secret>` → คำอธิบาย secret
- License → เลือกที่ถูก (MIT, Apache, etc.)

### 3. Optional — เพิ่ม GitHub Actions badge

ถ้าจะทำ CI/CD ทีหลัง:
```markdown
![Build](https://github.com/<user>/<repo>/actions/workflows/build.yml/badge.svg)
```

---

## 🎁 Bonus — สร้างไฟล์เพิ่ม

### `backend/.env.example`

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/auction_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# Redis
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

# JWT (Generate: openssl rand -base64 64)
APP_JWT_SECRET=REPLACE_WITH_YOUR_SECRET
APP_JWT_EXPIRATION_MS=86400000
```

### `backend/HELP.md` (Quick reference)

```markdown
# Quick Reference

## Commands
```bash
./mvnw clean                        # Clean build
./mvnw spring-boot:run              # Dev server
./mvnw test                         # Run tests
./mvnw clean package -DskipTests    # Build jar
docker compose up -d                # Start stack
docker compose logs -f backend      # Tail logs
```

## Ports
- Backend: 8080
- PostgreSQL: 5432
- Redis: 6379

## Health Check
- Backend: http://localhost:8080/api/auctions
- Swagger (if added): http://localhost:8080/swagger-ui
```

---

## 📤 ส่งผลมา

**หลัง paste README:**

1. **ดูเป็นยังไง?** — มีตรงไหนอยากปรับเพิ่ม
2. **อยากเพิ่ม section อะไรอีก?** เช่น
   - Deployment guide
   - Performance benchmarks
   - Security notes
3. **พร้อม commit ไหม?**

```powershell
git add backend/README.md
git commit -m "docs: add comprehensive backend README"
git push
```

---

**พี่อยากให้ feedback เพิ่มเติมไหม?** 💪

เช่น อยากได้:
- **Diagram** เพิ่มเติม
- **Sequence diagrams** สำหรับ flows
- **Postman collection** แนบใน README
- **Swagger/OpenAPI** documentation

**บอกพี่มา!**