# BidFlow Backend — Developer Handoff

This README precisely reflects the current implementation in the `backend` source. It is written for frontend engineers who need to run the service and integrate with its APIs and WebSocket events. All statements below are based on the repository code (controllers, DTOs, services, configs, enums, and exception handlers).

---

## Part 1 — Issues found in the previous README
- The previous README listed `WIN_PAYMENT` as an active ledger flow. The code defines `TransactionType.WIN_PAYMENT` in the enum but the `WalletService` does not create `WIN_PAYMENT` transactions; settlement uses `SELLER_PAYOUT`. README removed `WIN_PAYMENT` from ledger flow descriptions and notes the enum value is unused in current wallet flows.
- The previous README implied events are published after DB commit. In code both `BidService` (uses `TransactionTemplate`) and `AuctionSettlementExecutor` (annotated `@Transactional`) call `BidEventPublisher` while still inside the transaction scope. README now states events are published from within the transaction.
- Minor mismatches corrected: all endpoints, request/response fields, status codes, and mapped exceptions were aligned to controller/DTO/GlobalExceptionHandler implementations.

---

## Part 2 — Revised README.md (replaceable)

1. Overview
- Backend is a Spring Boot application that provides a real-time auction platform: user auth, auction CRUD, bidding with distributed locking, wallet ledger (hold/release/payout), notifications, STOMP WebSocket broadcasts, and a periodic auction settlement scheduler.

2. Tech Stack
- Java 21, Spring Boot (see `pom.xml`)
- Spring Data JPA (PostgreSQL)
- Spring Security (JWT integration)
- Spring WebSocket / STOMP (SockJS fallback)
- Redisson (distributed locks) with Redis
- JJWT (io.jsonwebtoken) for token handling
- Docker / Docker Compose for quick local environment

3. Architecture (high-level)
- HTTP controllers implement REST APIs under `/api/*`.
- Authentication: JWT handled by `JwtService` + `JwtAuthFilter`; authenticated username is placed in SecurityContext as principal.
- Bidding: per-auction Redisson lock keyed `auction:bid:{auctionId}` in `BidService`; bid processing runs inside a programmatic transaction (`TransactionTemplate`) to ensure DB transaction boundaries relative to the lock.
- Wallet: `WalletService` keeps `User.walletBalance` and appends `WalletTransaction` ledger entries for DEPOSIT, WITHDRAW, BID_HOLD, BID_RELEASE, SELLER_PAYOUT.
- Settlement: `AuctionSettlementService` (scheduler) finds expired auctions and calls `AuctionSettlementExecutor.settleAuction(auctionId)`; `settleAuction` is `@Transactional` and finalizes winner, calls `walletService.settleToSeller(...)`, creates notifications, and publishes an `AUCTION_ENDED` event.
- Real-time: `BidEventPublisher` sends events to `/topic/auctions/{auctionId}` via `SimpMessagingTemplate`.

4. Project Structure (packages)
- `controller` — REST controllers: `AuthController`, `UserController`, `AuctionController`, `BidController`, `WalletController`, `NotificationController`.
- `service` — business logic: `AuthService`, `AuctionService`, `BidService`, `WalletService`, `NotificationService`, `AuctionSettlementService`, `AuctionSettlementExecutor`, `BidEventPublisher`.
- `dto` — request/response records (e.g., `PlaceBidRequest`, `BidResponse`, `AuctionResponse`, `BidEvent`).
- `entity` / `repository` — JPA entities and Spring Data repositories.
- `config` / `security` / `exception` — WebSocket, SecurityConfig, Jwt* classes, and `GlobalExceptionHandler`.

5. Prerequisites
- JDK 21
- Maven
- PostgreSQL (or Docker via compose)
- Redis (or Docker via compose)
- Docker & Docker Compose (optional, recommended for local dev)

6. Configuration / Environment variables
- Primary config files: `src/main/resources/application.yaml` and `application-docker.yaml` (docker profile).
- Notable properties in `application.yaml`:
  - `spring.datasource.url` (default jdbc:postgresql://localhost:5432/auction_db)
  - `spring.datasource.username` / `spring.datasource.password` (defaults `postgres` / `postgres`)
  - `spring.data.redis.host` / `port` (defaults `localhost:6379`)
  - `app.jwt.secret` (DEV default exists in `application.yaml`, must be Base64; production should set via env var)
  - `app.jwt.expiration-ms` (token lifetime)

7. Running locally
1) Docker Compose (quickest): from repository root:

```bash
docker compose up --build
```

This starts `postgres-db` (5432), `redis` (6379) and `backend` (8080). The `backend` service runs with `SPRING_PROFILES_ACTIVE=docker` and uses `application-docker.yaml` (DB host `postgres-db`, Redis host `redis`). The compose file mounts `init-scripts/schema.sql` into Postgres to initialize schema.

2) Run without Docker:

```bash
cd backend
mvn clean package
java -jar target/*.jar
```

Ensure PostgreSQL and Redis are reachable per `application.yaml`. Note: `spring.jpa.hibernate.ddl-auto: validate` — database schema must match JPA entities (use provided `init-scripts/schema.sql` or apply migrations before running).

8. API reference (controllers and DTOs — exact shapes come from DTO records)

Authentication
- POST /api/auth/register — Request: `RegisterRequest` (username, email, password, fullName). Response: `AuthResponse` (token, tokenType="Bearer", userId, username, email, fullName). Returns 201 Created.
- POST /api/auth/login — Request: `LoginRequest` (username, password). Response: `AuthResponse`. Returns 200 OK.

Users
- GET /api/users/me — Auth required. Response: `UserResponse` (id, username, email, fullName, walletBalance, createdAt).

Auctions
- POST /api/auctions — Auth required. Request: `CreateAuctionRequest`. Response: `AuctionResponse`. Returns 201 Created.
- GET /api/auctions — Public. Optional query `status` (enum: DRAFT, ACTIVE, ENDED, CANCELLED), `page`, `size`. Response: paged `AuctionSummaryResponse`.
- GET /api/auctions/my — Auth required. Query `page`, `size`. Response: paged `AuctionSummaryResponse`.
- GET /api/auctions/{id} — Public. Response: `AuctionResponse`.
- PUT /api/auctions/{id} — Auth required. Request: `UpdateAuctionRequest`. Response: `AuctionResponse`.
- DELETE /api/auctions/{id} — Auth required. Returns 204 No Content.

Bidding
- POST /api/auctions/{auctionId}/bids — Auth required. Request: `PlaceBidRequest` (amount). Returns 201 Created `BidResponse` (id, auctionItemId, bidderId, bidderUsername, bidAmount, bidSequence, createdAt).
  - Implementation notes (from `BidService`):
    - Distributed lock key: `auction:bid:{auctionId}` (Redisson `tryLock(3, TimeUnit.SECONDS)`).
    - Processing runs inside `TransactionTemplate.execute(...)` (programmatic transaction).
    - Steps in code: validate auction status/time; load bidder; prevent seller self-bid; compute min required (`currentPrice + minIncrement`); find previous highest bid; `walletService.release(previousHighest.bidder, previousHighest.bidAmount, auctionId)` if present; `walletservice.hold(bidder, amount, auctionId)`; create/save `Bid`; update auction `currentPrice` and `totalBids`; publish `BID_PLACED` event via `BidEventPublisher`.
    - The event is published inside the transaction scope (i.e., publish call occurs before the surrounding transaction completes in code).
- GET /api/auctions/{auctionId}/bids — Public. Query `page`, `size`. Response: paged `BidSummaryResponse`.

Wallet
- GET /api/wallet/me — Auth required. Response: `WalletResponse` (userId, username, walletBalance).
- POST /api/wallet/me/deposit — Auth required. Request: `DepositRequest` (amount). Returns 201 Created `WalletTransactionResponse`.
- POST /api/wallet/me/withdraw — Auth required. Request: `WithdrawRequest` (amount). Returns 201 Created `WalletTransactionResponse` or 400 `InsufficientBalanceException`.
- GET /api/wallet/me/transactions — Auth required. Query `page`, `size`. Response: paged `WalletTransactionResponse`.

Notifications
- GET /api/notifications — Auth required. Query `page`, `size`. Response: paged `NotificationResponse`.
- PUT /api/notifications/{id}/read — Auth required. Returns 204 No Content.

9. JWT Authentication (implementation)
- `JwtService` creates and validates tokens using `app.jwt.secret` (Base64) and `app.jwt.expiration-ms`.
- `JwtAuthFilter` reads `Authorization: Bearer <token>`, extracts username, loads user, calls `jwtService.isTokenValid(token, user)`, and if valid sets an Authentication with authority `ROLE_USER` in SecurityContext.
- Security rules (in `SecurityConfig`):
  - `/api/auth/**` and GET `/api/auctions` and GET `/api/auctions/*` and GET `/api/auctions/*/bids` are permitted to all.
  - GET `/api/auctions/my` requires authentication.
  - WebSocket handshake path `/ws/**` is permitted to all.
  - All other requests require authentication.

10. Wallet and ledger (precise behavior)
- `WalletService` updates `User.walletBalance` and persists `WalletTransaction` entries for the following types:
  - `DEPOSIT` — credits balance and records positive amount.
  - `WITHDRAW` — debits balance and records negative amount.
  - `BID_HOLD` — used when a bid is placed: subtracts `amount` from `walletBalance` and records a `BID_HOLD` transaction with negative `amount` and `referenceType=AUCTION_ITEM`.
  - `BID_RELEASE` — used when a previous highest bidder is outbid: adds `amount` back to `walletBalance` and records `BID_RELEASE` transaction.
  - `SELLER_PAYOUT` — created during settlement to credit the seller.
- Important: although `TransactionType` enum contains `WIN_PAYMENT`, current code does not create `WIN_PAYMENT` transactions. Settlement credits the seller via `SELLER_PAYOUT`. The winner's funds are not recorded again at settlement (winner's amount was held earlier with `BID_HOLD`).

11. Auction settlement (exact implementation)
- Scheduler: `AuctionSettlementService.closeExpiredAuctions()` is annotated with `@Scheduled(fixedDelay = 30_000, initialDelay = 10_000)` and finds expired auctions using `AuctionItemRepository.findByStatusAndEndTimeBefore(AuctionStatus.ACTIVE, OffsetDateTime.now())`.
- Executor: `AuctionSettlementExecutor.settleAuction(Long auctionId)` is the transactional executor called by the scheduler.
- `settleAuction` (code flow):
  1. Load auction; if not `ACTIVE` return.
  2. Query highest bid via `bidRepository.findFirstByAuctionItemIdOrderByBidAmountDesc(auctionId)`.
  3. If no bids → set `auction.status = ENDED`, save auction, create a notification for seller.
  4. If highest bid exists → set `auction.winner`, set `auction.status = ENDED`, save auction; call `walletService.settleToSeller(winner, seller, highestBid.getBidAmount(), auctionId)` (this method credits the seller and creates a `SELLER_PAYOUT` transaction); create notifications for winner and seller; publish `AUCTION_ENDED` event via `BidEventPublisher`.
  - `settleAuction` is annotated `@Transactional` in code; the publish call occurs within that transactional method.

12. WebSocket / Real-time (exact)
- STOMP handshake endpoint: `/ws` (registered with `.withSockJS()` and `.setAllowedOriginPatterns("*")`).
- Server uses `/app` as application destination prefix and `/topic` as simple broker prefix.
- Events published to `/topic/auctions/{auctionId}` via `SimpMessagingTemplate.convertAndSend(...)`.
- `BidEvent` record fields are: `type`, `auctionId`, `bidId`, `bidderId`, `bidderUsername`, `amount`, `sequence`, `currentPrice`, `timestamp`.
- Note: both `BidService` (during placeBid) and `AuctionSettlementExecutor` publish events while still inside transactional scope (publish calls occur before the surrounding transaction completes in the current implementation).

13. Error responses (exact shape)
- All handled errors return `ErrorResponse` record shape:

```json
{
  "timestamp": "2026-09-25T12:34:56Z",
  "status": 400,
  "error": "Validation Failed",
  "message": "...",
  "path": "/api/..",
  "details": { "field": "message" } // nullable
}
```

- Exception → HTTP mapping (from `GlobalExceptionHandler`):
  - `UserNotFoundException` → 404
  - `NoResourceFoundException` → 404
  - `InsufficientBalanceException` → 400 (details include `currentBalance` and `requestedAmount`)
  - `MethodArgumentNotValidException` → 400 (validation details)
  - `IllegalArgumentException` → 400
  - `BadCredentialsException` → 401
  - `AccessDeniedException` → 403
  - Other exceptions → 500

14. Testing
- The repository contains `ConcurrentBiddingTest` (SpringBootTest) which tests concurrent bidding semantics (ensures concurrent attempts result in expected single-winner behavior under the lock). Run tests with:

```bash
cd backend
mvn test
```

15. Docker (files & run)
- `backend/Dockerfile` is a two-stage Maven build and copies `target/*.jar` to runtime image; exposes 8080.
- `docker-compose.yml` brings up `postgres-db` (postgres:16), `redis` (redis:7) and `backend` (build context `./backend`), mapping host ports 5432, 6379 and 8080 respectively. `backend` sets `SPRING_PROFILES_ACTIVE=docker`.

16. Frontend integration guide (practical flow)
1. Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "s3cret",
  "fullName": "Alice"
}
```
Response: 201 `AuthResponse` (token, tokenType="Bearer", userId, username, email, fullName)

2. Login
```http
POST /api/auth/login
Content-Type: application/json

{ "username": "alice", "password": "s3cret" }
```
Response: 200 `AuthResponse` (token)

3. Use token
- Add header `Authorization: Bearer <token>` to authenticated requests.

4. Read auctions
- GET `/api/auctions` (public) → paged `AuctionSummaryResponse`.
- GET `/api/auctions/{id}` (public) → `AuctionResponse`.

5. Subscribe real-time updates
- Open STOMP over WebSocket to `ws://<host>:8080/ws` (SockJS enabled).
- Subscribe to `/topic/auctions/{auctionId}` to receive `BidEvent` messages.

6. Place a bid
```http
POST /api/auctions/{auctionId}/bids
Authorization: Bearer <token>
Content-Type: application/json

{ "amount": 1500.00 }
```
Response: 201 `BidResponse`.
Note: `BidEvent` is published from within the same transactional scope as bid processing (see WebSocket note above).

7. Wallet / notifications
- GET `/api/wallet/me` → `WalletResponse`.
- POST `/api/wallet/me/deposit` /withdraw with body `{ "amount": <number> }` → 201 `WalletTransactionResponse`.
- GET `/api/notifications` and PUT `/api/notifications/{id}/read`.

17. Common issues
- Database schema: `spring.jpa.hibernate.ddl-auto: validate` — ensure schema matches entities. Use `init-scripts/schema.sql` in Docker Compose or apply migrations.
- `app.jwt.secret` in `application.yaml` is a DEV placeholder. Do not check-in production secrets; set a secure Base64 secret via environment variables.
- WebSocket allowed origins: `setAllowedOriginPatterns("*")` in `WebSocketConfig` (DEV only). Restrict origins in production.

18. Development notes
- Locking: `BidService` uses Redisson lock `auction:bid:{auctionId}` and `tryLock(3, TimeUnit.SECONDS)`.
- Transactions: `BidService` uses `TransactionTemplate.execute(...)` (programmatic transaction) to ensure transactional behavior relative to the lock. `AuctionSettlementExecutor.settleAuction` is `@Transactional`.
- Ledger: winner's money is not double-transacted at settlement; settlement credits seller via `SELLER_PAYOUT` and relies on earlier `BID_HOLD` for the winner's held funds.

