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
- Backend is a Spring Boot application that provides a real-time auction platform: user auth (password or Google sign-in), auction CRUD with categories, bidding with distributed locking, wallet ledger (hold/release/payout), notifications, STOMP WebSocket broadcasts, a periodic auction settlement scheduler, and an admin API (categories, users, auctions, stats).

2. Tech Stack
- Java 21, Spring Boot (see `pom.xml`)
- Spring Data JPA (PostgreSQL)
- Spring Security (JWT integration)
- Spring WebSocket / STOMP (SockJS fallback)
- Redisson (distributed locks) with Redis
- JJWT (io.jsonwebtoken) for token handling
- AWS SDK for Java v2 (`software.amazon.awssdk:s3`, BOM 2.55.6) for item photos in S3 or any S3-compatible store (dev uses `adobe/s3mock`)
- Flyway 12 (`spring-boot-starter-flyway` + `flyway-database-postgresql`) for schema migrations after the initial schema
- Spring Security OAuth2 JOSE (`spring-security-oauth2-jose`, Nimbus) to verify Google ID tokens
- Docker / Docker Compose for quick local environment

3. Architecture (high-level)
- HTTP controllers implement REST APIs under `/api/*`.
- Authentication: JWT handled by `JwtService` + `JwtAuthFilter`; authenticated username is placed in SecurityContext as principal.
- Bidding: per-auction Redisson lock keyed `auction:bid:{auctionId}` in `BidService`; bid processing runs inside a programmatic transaction (`TransactionTemplate`) to ensure DB transaction boundaries relative to the lock.
- Wallet: `WalletService` keeps `User.walletBalance` and appends `WalletTransaction` ledger entries for DEPOSIT, WITHDRAW, BID_HOLD, BID_RELEASE, SELLER_PAYOUT.
- Settlement: `AuctionSettlementService` (scheduler) finds expired auctions and calls `AuctionSettlementExecutor.settleAuction(auctionId)`; `settleAuction` is `@Transactional` and finalizes winner, calls `walletService.settleToSeller(...)`, creates notifications, and publishes an `AUCTION_ENDED` event.
- Real-time: `BidEventPublisher` sends events to `/topic/auctions/{auctionId}` via `SimpMessagingTemplate`.
- Visibility: `DRAFT` / `CANCELLED` auctions are visible to their seller only — `GET /api/auctions/{id}` answers 404 to anyone else, and `GET /api/auctions` lists `ACTIVE` / `ENDED` only.
- Photos: `AuctionImageService` checks ownership + DRAFT, detects the type from the file's magic bytes (JPEG / PNG / WebP), stores it through `StorageService` under `auctions/{id}/{uuid}.{ext}` and records it in `item_images`. The bucket is private; responses carry presigned GET URLs valid for 60 minutes. `StorageService` creates the bucket when the app is ready and only logs a warning if storage is unreachable.
- Categories: every auction has exactly one category (`auction_items.category_id`, required). `CategoryService` lists visible categories (name order, `Other` last), resolves the `?category=<slug>` filter, and lets admins add / rename / hide / delete them. Slugs are generated once from the name and never change. `Other` (slug `other`) can't be hidden or deleted. Hidden categories disappear from the public list, the filter and the create/edit forms, but auctions that already use them keep them.
- Roles & suspension: `users.role` is `USER` or `ADMIN`, `users.suspended` blocks an account. `JwtAuthFilter` reloads the user on every request and takes the authorities from the database (`ROLE_` + role), so a role change or a suspension applies to existing tokens at once. `/api/admin/**` requires `ROLE_ADMIN`.
- Admin: `AdminUserService` (search, suspend / unsuspend — admins can't be suspended), `AdminAuctionService` (cancel DRAFT / ACTIVE with a reason under the same Redisson lock as bidding: refunds the leading bid and notifies the seller and every bidder), `AdminStatsService` (dashboard numbers). Every admin action is logged at INFO with the admin's username.
- First admin: `AdminBootstrap` (runs after `DataSeeder`) reads `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Existing username → promoted to ADMIN (password untouched). Otherwise a new admin is created (email required, password ≥ 8, email not used by someone else). Anything missing or invalid → logged and skipped; the app still starts. It never demotes anyone and never logs the password.
- Google sign-in: the browser gets an ID token from Google Identity Services and posts it to `POST /api/auth/google`. `GoogleTokenVerifier` checks it against Google's public keys (JWKS, RS256) plus `iss`, `aud` = our Client ID, expiry and `email_verified`. `GoogleAuthService` matches the account by Google `sub`, then by email (links it), otherwise creates a new account without a password; the response is our own JWT, same as a password login. No client secret is involved.
- Schema: `init-scripts/schema.sql` creates the initial schema (Flyway baseline version 1). Later changes are Flyway migrations in `src/main/resources/db/migration` (`V2__categories_roles_google.sql`: categories, `category_id`, role, suspended, `google_sub`, nullable `password_hash`). Flyway runs before Hibernate's `validate`.

4. Project Structure (packages)
- `controller` — REST controllers: `AuthController`, `UserController`, `CategoryController`, `AuctionController`, `BidController`, `MyBidController`, `WalletController`, `NotificationController`, and the admin controllers `AdminStatsController`, `AdminUserController`, `AdminAuctionController`, `AdminCategoryController`.
- `service` — business logic: `AuthService`, `GoogleAuthService`, `CategoryService`, `AuctionService`, `AuctionImageService`, `StorageService`, `BidService`, `WalletService`, `NotificationService`, `AuctionSettlementService`, `AuctionSettlementExecutor`, `BidEventPublisher`, `AdminUserService`, `AdminAuctionService`, `AdminStatsService`.
- `dto` — request/response records (e.g., `PlaceBidRequest`, `BidResponse`, `AuctionResponse`, `BidEvent`, `CategoryResponse`, `AdminUserResponse`).
- `entity` / `repository` / `enums` — JPA entities (incl. `Category`), Spring Data repositories, enums (incl. `Role`).
- `config` / `security` / `exception` — WebSocket, SecurityConfig, `StorageConfig` (S3 client + presigner), `DataSeeder`, `AdminBootstrap`, Jwt* classes, `GoogleTokenVerifier`, and `GlobalExceptionHandler`.
- `src/main/resources/db/migration` — Flyway migrations (`V2__…`).

5. Prerequisites
- JDK 21
- Maven
- PostgreSQL (or Docker via compose)
- Redis (or Docker via compose)
- S3-compatible object storage (or Docker via compose) — without it the app still starts, but photo upload fails
- Docker & Docker Compose (optional, recommended for local dev)

6. Configuration / Environment variables
- Primary config files: `src/main/resources/application.yaml` and `application-docker.yaml` (docker profile).
- Notable properties in `application.yaml`:
  - `spring.datasource.url` (default jdbc:postgresql://localhost:5432/auction_db)
  - `spring.datasource.username` / `spring.datasource.password` (defaults `postgres` / `postgres`)
  - `spring.data.redis.host` / `port` (defaults `localhost:6379`)
  - `app.jwt.secret` (DEV default exists in `application.yaml`, must be Base64; production should set via env var)
  - `app.jwt.expiration-ms` (token lifetime)
  - `spring.servlet.multipart.max-file-size` 5MB / `max-request-size` 6MB, `server.tomcat.max-swallow-size` 10MB (lets Tomcat drain an oversized upload and still answer 413)
- Object storage — `app.storage.*`, read from environment variables (no credentials in code):

| Env var | Default | Meaning |
|---|---|---|
| `STORAGE_BUCKET` | `bidflow-images` | Bucket name (created on startup if missing) |
| `STORAGE_REGION` | `us-east-1` | Region |
| `STORAGE_ENDPOINT` | `http://localhost:9090` | S3 endpoint the backend calls. **Empty = real AWS S3** |
| `STORAGE_PUBLIC_ENDPOINT` | (empty = same as endpoint) | Host used in presigned URLs — must be reachable from the browser |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | (empty) | Static keys. **Empty = AWS default credentials chain** (env, profile, IAM role) |
| `STORAGE_PATH_STYLE` | `true` | Path-style URLs (needed by s3mock / MinIO; use `false` for AWS) |

  To use AWS S3: set `STORAGE_BUCKET`, `STORAGE_REGION`, leave `STORAGE_ENDPOINT` / `STORAGE_PUBLIC_ENDPOINT` empty, `STORAGE_PATH_STYLE=false`, and provide credentials through an IAM role or env vars.

- Admin account and Google sign-in — `app.admin.*` / `app.google.client-id`, read from environment variables. With Docker Compose, put them in a `.env` file at the repository root (copy `.env.example`; `.env` is gitignored) — compose passes them to the backend:

| Env var | Default | Meaning |
|---|---|---|
| `ADMIN_USERNAME` | (empty = skip) | Username of the first admin. An existing user with this name is promoted |
| `ADMIN_EMAIL` | (empty) | Email for a new admin (must not belong to another account) |
| `ADMIN_PASSWORD` | (empty) | Password for a new admin, at least 8 characters (stored as bcrypt, never logged) |
| `GOOGLE_CLIENT_ID` | (empty = Google sign-in off → `POST /api/auth/google` answers 503) | OAuth 2.0 Client ID (Web application) from Google Cloud Console. Not a secret. Must equal the frontend's `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |

- Flyway: `spring.flyway.baseline-on-migrate: true`, `baseline-version: 1` — an existing database created from `schema.sql` is baselined at version 1 and then migrated to V2 on the first start.

7. Running locally
1) Docker Compose (quickest): from repository root:

```bash
docker compose up --build
```

This starts `postgres-db` (5432), `redis` (6379), `object-storage` (`adobe/s3mock:5.2.3`, 9090, files kept in volume `object_storage_data`) and `backend` (8080). The `backend` service runs with `SPRING_PROFILES_ACTIVE=docker` and uses `application-docker.yaml` (DB host `postgres-db`, Redis host `redis`) plus the `STORAGE_*` variables from compose. The compose file mounts `init-scripts/schema.sql` into Postgres to initialize schema; on start the backend applies the Flyway migrations on top.

Optional: create `.env` at the repository root from `.env.example` to create the first admin (`ADMIN_*`) and to enable Google sign-in (`GOOGLE_CLIENT_ID`), then `docker compose up -d backend` again.

> Upgrading a database from before the categories / roles change: the first start migrates it (V2) — existing auctions get the `Other` category (the seeded demo items get matching categories), every user becomes `USER`, not suspended. Take a backup first (`docker exec auction-postgres pg_dump -U postgres auction_db > backup.sql`).

If those host ports are taken on your machine, put port overrides in a gitignored `docker-compose.local.yml` (e.g. `ports: !override ["5433:5432"]`) and run `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build`.

2) Run without Docker:

```bash
cd backend
mvn clean package
java -jar target/*.jar
```

Ensure PostgreSQL and Redis are reachable per `application.yaml`. Note: `spring.jpa.hibernate.ddl-auto: validate` — database schema must match JPA entities. Create the database with `init-scripts/schema.sql`; Flyway applies the later migrations when the app starts.

8. API reference (controllers and DTOs — exact shapes come from DTO records)

Authentication
- POST /api/auth/register — Request: `RegisterRequest` (username, email, password, fullName). Response: `AuthResponse` (token, tokenType="Bearer", userId, username, email, fullName). Returns 201 Created.
- POST /api/auth/login — Request: `LoginRequest` (username, password). Response: `AuthResponse`. Returns 200 OK. Wrong password or an account without a password (Google-only) → 401 "Invalid username or password"; right password but suspended → 403 "Account suspended".
- POST /api/auth/google — Request: `GoogleLoginRequest` (credential = Google ID token). Response: `AuthResponse`, 200 OK for an existing or a new account. 401 invalid token · 403 suspended · 409 email linked to another Google account · 503 `GOOGLE_CLIENT_ID` not set.

Users
- GET /api/users/me — Auth required. Response: `UserResponse` (id, username, email, fullName, walletBalance, createdAt, role).

Categories
- GET /api/categories — Public. Visible categories `CategoryResponse` (id, name, slug), `Other` last.

Auctions
- POST /api/auctions — Auth required. Request: `CreateAuctionRequest` (… `categoryId` required, must be a visible category). Response: `AuctionResponse` (status `DRAFT`). Returns 201 Created.
- GET /api/auctions — Public. Query `status` (`ACTIVE` or `ENDED`; omitted = both; anything else → 400), `q` (title/description, case-insensitive, ≤ 100 chars, `%` `_` `\` matched literally), `sort` (`newest` default, `endingSoon`, `priceAsc`, `priceDesc`, `mostBids`; anything else → 400), `category` (slug of a visible category; unknown / hidden → 400), `page`, `size` (capped at 50). Response: paged `AuctionSummaryResponse` (… `startTime`, `primaryImageUrl`, `category`). The page's categories are loaded in one query.
- GET /api/auctions/my — Auth required. Query `page`, `size`. Response: paged `AuctionSummaryResponse` (all statuses).
- GET /api/auctions/{id} — Public (token optional). Response: `AuctionResponse` with `images[]`. 404 for a missing auction and for someone else's DRAFT / CANCELLED (same response).
- PUT /api/auctions/{id} — Auth required (owner, DRAFT). Request: `UpdateAuctionRequest` (optional `categoryId`; the current category is kept even if it was hidden meanwhile). Response: `AuctionResponse`.
- DELETE /api/auctions/{id} — Auth required (owner, DRAFT → CANCELLED). Returns 204 No Content.
- POST /api/auctions/{id}/publish — Auth required (owner). DRAFT → ACTIVE; 400 if not DRAFT or `endTime` has passed, 403 if not the owner. Returns 200 `AuctionResponse`.
- POST /api/auctions/{id}/images — Auth required (owner, DRAFT). `multipart/form-data` part `file`: JPEG / PNG / WebP by content, ≤ 5 MB (413 above), ≤ 5 per auction. Returns 201 `AuctionImageResponse` (id, url, isPrimary, displayOrder).
- DELETE /api/auctions/{id}/images/{imageId} — Auth required (owner, DRAFT). Deletes the object too; the next photo becomes primary. Returns 204.

Bidding
- POST /api/auctions/{auctionId}/bids — Auth required. Request: `PlaceBidRequest` (amount). Returns 201 Created `BidResponse` (id, auctionItemId, bidderId, bidderUsername, bidAmount, bidSequence, createdAt).
  - Implementation notes (from `BidService`):
    - Distributed lock key: `auction:bid:{auctionId}` (Redisson `tryLock(3, TimeUnit.SECONDS)`).
    - Processing runs inside `TransactionTemplate.execute(...)` (programmatic transaction).
    - Steps in code: validate auction status/time; load bidder; prevent seller self-bid; compute min required (`currentPrice + minIncrement`); find previous highest bid; `walletService.release(previousHighest.bidder, previousHighest.bidAmount, auctionId)` if present; `walletservice.hold(bidder, amount, auctionId)`; create/save `Bid`; update auction `currentPrice` and `totalBids`; publish `BID_PLACED` event via `BidEventPublisher`.
    - The event is published inside the transaction scope (i.e., publish call occurs before the surrounding transaction completes in code).
    - When someone else outbids the previous leader, a "You've been outbid" notification is created for that leader in the same transaction (raising your own bid creates none).
- GET /api/auctions/{auctionId}/bids — Public. Query `page`, `size`. Response: paged `BidSummaryResponse`.
- GET /api/bids/me — Auth required. Query `page`, `size` (capped at 50). One row per auction the user bid on, latest bid first: `MyBidResponse` (auctionId, title, status, currentPrice, endTime, myHighestBid, myBidCount, lastBidAt, result = LEADING | OUTBID | WON | LOST | CANCELLED, primaryImageUrl).

Wallet
- GET /api/wallet/me — Auth required. Response: `WalletResponse` (userId, username, walletBalance).
- POST /api/wallet/me/deposit — Auth required. Request: `DepositRequest` (amount). Returns 201 Created `WalletTransactionResponse`.
- POST /api/wallet/me/withdraw — Auth required. Request: `WithdrawRequest` (amount). Returns 201 Created `WalletTransactionResponse` or 400 `InsufficientBalanceException`.
- GET /api/wallet/me/transactions — Auth required. Query `page`, `size`. Response: paged `WalletTransactionResponse`.

Notifications
- GET /api/notifications — Auth required. Query `page`, `size`. Response: paged `NotificationResponse`.
- PUT /api/notifications/{id}/read — Auth required. Returns 204 No Content.

Admin (role `ADMIN`; not logged in → 401, USER → 403) — details in `../API_DOCUMENTATION.md`
- GET /api/admin/stats — `AdminStatsResponse` (totalUsers, suspendedUsers, adminUsers, auctionsByStatus, totalBids, totalSales).
- GET /api/admin/users — Query `q`, `page`, `size` (≤ 50). Paged `AdminUserResponse`, newest first.
- POST /api/admin/users/{id}/suspend · /unsuspend — 200 `AdminUserResponse`; 400 for admins, 404 unknown id.
- GET /api/admin/auctions — Query `status` (any, omitted = all), `q`, `page`, `size`. Paged `AuctionSummaryResponse`.
- POST /api/admin/auctions/{id}/cancel — Request `CancelAuctionRequest` (reason 1–500). 204; 400 unless DRAFT / ACTIVE; 409 while a bid is processed or the auction was just closed.
- GET / POST /api/admin/categories · PATCH / DELETE /api/admin/categories/{id} — `AdminCategoryResponse` (id, name, slug, active, auctionCount). 409 duplicate name or category in use; 400 for `Other`.

9. JWT Authentication (implementation)
- `JwtService` creates and validates tokens using `app.jwt.secret` (Base64) and `app.jwt.expiration-ms`.
- `JwtAuthFilter` reads `Authorization: Bearer <token>`, extracts username, loads the user, skips suspended users (the request continues unauthenticated → 401 on protected endpoints), calls `jwtService.isTokenValid(token, user)`, and if valid sets an Authentication whose authorities come from the user's role in the database (`ROLE_USER` / `ROLE_ADMIN`) — role claims in the token are not trusted.
- Security rules (in `SecurityConfig`):
  - `/api/auth/**` and GET `/api/auctions` and GET `/api/auctions/*` and GET `/api/auctions/*/bids` and GET `/api/categories` are permitted to all.
  - GET `/api/auctions/my` requires authentication.
  - `/api/admin/**` requires `hasRole("ADMIN")` (access denied → 403 with an empty body).
  - WebSocket handshake path `/ws/**` is permitted to all.
  - All other requests require authentication.

10. Wallet and ledger (precise behavior)
- `WalletService` updates `User.walletBalance` and persists `WalletTransaction` entries for the following types:
  - `DEPOSIT` — credits balance and records positive amount.
  - `WITHDRAW` — debits balance and records negative amount.
  - `BID_HOLD` — used when a bid is placed: subtracts `amount` from `walletBalance` and records a `BID_HOLD` transaction with negative `amount` and `referenceType=AUCTION_ITEM`.
  - `BID_RELEASE` — used when a previous highest bidder is outbid, or when an admin cancels an auction (description "Refund: auction X cancelled by admin"): adds `amount` back to `walletBalance` and records `BID_RELEASE` transaction.
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
  - `AuctionNotFoundException` → 404
  - `NoResourceFoundException` → 404
  - `InsufficientBalanceException` → 400 (details include `currentBalance` and `requestedAmount`)
  - `MethodArgumentNotValidException` → 400 (validation details)
  - `MethodArgumentTypeMismatchException` → 400 (e.g. `?status=FOO`)
  - `MaxUploadSizeExceededException` → 413
  - `MultipartException` / `MissingServletRequestPartException` → 400
  - `HttpMessageNotReadableException` (no body / invalid JSON) → 400 "Request body is missing or is not valid JSON"
  - `IllegalArgumentException` → 400
  - `BadCredentialsException` → 401
  - `AccessDeniedException` → 403
  - `ResponseStatusException` → its status and reason (used for 403 suspended, 404, 409 conflicts, 503 Google not configured)
  - `HttpRequestMethodNotSupportedException` → 405 (with `Allow`)
  - `HttpMediaTypeNotSupportedException` → 415 (with `Accept`)
  - Other exceptions → 500

14. Testing
- Unit tests that need no database or Spring context (safe to run any time):
  - `security/GoogleTokenVerifierTest` — signed test tokens: valid, wrong audience / issuer, expired, other key, unverified email, HS256 (alg confusion), unsigned, tampered payload.
  - `service/GoogleAuthServiceTest` (Mockito) — account matching: new account, link by email, known Google account, suspended, email linked to another Google account, username taken, concurrent first sign-in.

```bash
cd backend
mvn test -Dtest='GoogleTokenVerifierTest,GoogleAuthServiceTest' -Dsurefire.failIfNoSpecifiedTests=false
# or without a local JDK/Maven:
docker run --rm -v "$PWD:/app" -v bidflow-m2:/root/.m2 -w /app maven:3.9-eclipse-temurin-21 \
  mvn -q test -Dtest='GoogleTokenVerifierTest,GoogleAuthServiceTest' -Dsurefire.failIfNoSpecifiedTests=false
```

- The older `ConcurrentBiddingTest` / `SettlementTest` (SpringBootTest) test concurrent bidding and settlement.

> ⚠️ Those older tests run against the configured database and clear its data — don't run them against a database you want to keep. They also create auctions without a category, so they fail since categories became required and need updating first.

15. Docker (files & run)
- `backend/Dockerfile` is a two-stage Maven build and copies `target/*.jar` to runtime image; exposes 8080. Known issue: its `HEALTHCHECK` calls `/actuator/health`, which doesn't exist (no actuator) and is secured, so the container reports `unhealthy` even though the app works.
- `docker-compose.yml` brings up `postgres-db` (postgres:16), `redis` (redis:7), `object-storage` (adobe/s3mock:5.2.3) and `backend` (build context `./backend`), mapping host ports 5432, 6379, 9090 and 8080 respectively. `backend` sets `SPRING_PROFILES_ACTIVE=docker` and the `STORAGE_*` variables (dev-only dummy keys — s3mock doesn't check them).

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
- Photos load in the backend but not in the browser: `STORAGE_PUBLIC_ENDPOINT` must be an address the browser can reach (in compose the backend uses `http://object-storage:9090`, the browser `http://localhost:9090`).
- Log line `Storage: cannot reach bucket ...` at startup: the storage service is down or misconfigured; everything except photo upload keeps working.
- `POST /api/auth/google` answers 503 "Google sign-in is not configured": `GOOGLE_CLIENT_ID` is empty for the backend (root `.env` → `docker compose up -d backend`). 401 for a real Google login usually means the frontend and backend use different Client IDs.
- Log line `AdminBootstrap: ADMIN_USERNAME is not set` at startup: no admin was created or promoted — expected until you set `ADMIN_*`.
- Removing an admin: there is no API for it (and admins can't suspend admins). Use SQL: `update users set role = 'USER' where username = '...';` — takes effect on the next request.

17a. Known limitations (security)
- **Google sign-in links accounts by email (accepted risk).** Password sign-up does not verify email addresses, so someone could register with another person's email first; when that person later uses "Continue with Google", they are signed into the account the other party knows the password for (pre-account hijacking). Accepted for this project; the fix would be to verify emails on sign-up, or to disable the password of an account once Google is linked.
- No rate limiting on `/api/auth/*`.
- Login timing differs between an unknown username and a wrong password, so usernames can be guessed.
- Wallet balance updates are read-modify-write without a row lock on `users`; two money operations of the same user at the same moment (e.g. a deposit during a bid on another auction) can lose one update.

18. Development notes
- Locking: `BidService` uses Redisson lock `auction:bid:{auctionId}` and `tryLock(3, TimeUnit.SECONDS)`.
- Transactions: `BidService` uses `TransactionTemplate.execute(...)` (programmatic transaction) to ensure transactional behavior relative to the lock. `AuctionSettlementExecutor.settleAuction` is `@Transactional`.
- Ledger: winner's money is not double-transacted at settlement; settlement credits seller via `SELLER_PAYOUT` and relies on earlier `BID_HOLD` for the winner's held funds.

