# BidFlow API Documentation

สรุป API หลักของโปรเจค BidFlow (Request / Response / Authentication / Error / HTTP status)

---

## Authentication
- Scheme: Bearer JWT ใน HTTP header `Authorization: Bearer <token>`
- ดูการตั้งค่า security ที่ [backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java](backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java#L1-L200)
- Public endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auctions`, `GET /api/auctions/{id}`, และอ่าน bids ของ auction
- Auth required: สร้าง/แก้ไข/ลบ auctions, `GET /api/auctions/my`, วาง bid, wallet, notifications, `GET /api/users/me`, ฯลฯ

---

## Common error response
ทุกข้อผิดพลาดที่จับโดย GlobalExceptionHandler จะส่งรูปแบบเดียวกัน (`ErrorResponse`)

Schema (ตัวอย่าง JSON):

```json
{
  "timestamp": "2026-09-25T12:34:56Z",
  "status": 400,
  "error": "Validation Failed",
  "message": "Invalid input data",
  "path": "/api/auctions",
  "details": { "title": "Title is required" }
}
```

รายละเอียด field: `timestamp`, `status`, `error`, `message`, `path`, `details` (object|null)
ดูการแม็ป exception ได้ที่ [backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java](backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java#L1-L400)

Mapped errors → HTTP status (สรุป):
- 400 Bad Request: validation failures, `InsufficientBalanceException`, `IllegalArgumentException`
- 401 Unauthorized: missing/invalid token, bad credentials
- 403 Forbidden: access denied / not owner
- 404 Not Found: resource not found
- 500 Internal Server Error: unexpected errors

---

## HTTP status quick-reference
- 200 OK — GETs หรือ updates ที่คืนค่า body
- 201 Created — resource created (เช่น สมัคร, สร้าง auction, place bid, deposit)
- 204 No Content — delete หรือ actions ที่ไม่คืน body
- 400 Bad Request — validation / bad input / insufficient balance
- 401 Unauthorized — missing/invalid JWT หรือ bad credentials
- 403 Forbidden — สิทธิ์ไม่เพียงพอ
- 404 Not Found — resource not found
- 500 Internal Server Error — unexpected

---

## Endpoints

Note: ชื่อ DTO อ้างอิงจาก `backend/src/main/java/com/bidflow/backend/dto`

### Auth

#### POST /api/auth/register
- Auth: public
- Request (`RegisterRequest`):
  - `username` (string, 3-50)
  - `email` (string, valid email)
  - `password` (string, 8-100)
  - `fullName` (string)
- Response: `AuthResponse` — 201 Created
- Errors: 400 validation

#### POST /api/auth/login
- Auth: public
- Request (`LoginRequest`): `username`, `password`
- Response: `AuthResponse` — 200 OK (มี JWT token)
- Errors: 400 validation, 401 bad credentials

### Users

#### GET /api/users/me
- Auth: required (Bearer)
- Request: none
- Response: `UserResponse` — 200 OK
- Errors: 401/403/404

### Auctions
(DTOs: `CreateAuctionRequest`, `UpdateAuctionRequest`, `AuctionResponse`, `AuctionSummaryResponse`)

#### POST /api/auctions
- Auth: required
- Request (`CreateAuctionRequest`):
  - `title` (string, required, max 150)
  - `description` (string)
  - `startPrice` (decimal, >0)
  - `minIncrement` (decimal, >0)
  - `startTime` (ISO datetime, futureOrPresent)
  - `endTime` (ISO datetime, future)
- Response: `AuctionResponse` — 201 Created
- Errors: 400 validation, 401

#### GET /api/auctions
- Auth: public
- Query params: `status` (enum), `page` (int, default 0), `size` (int, default 20)
- Response: `Page<AuctionSummaryResponse>` — 200 OK

#### GET /api/auctions/my
- Auth: required
- Query: `page`, `size`
- Response: `Page<AuctionSummaryResponse>` — 200 OK

#### GET /api/auctions/{id}
- Auth: public
- Path: `id` (long)
- Response: `AuctionResponse` — 200 OK
- Errors: 404

#### PUT /api/auctions/{id}
- Auth: required (owner, auction in DRAFT)
- Request: `UpdateAuctionRequest` (optional/partial fields)
- Response: `AuctionResponse` — 200 OK
- Errors: 400, 403, 404

#### DELETE /api/auctions/{id}
- Auth: required (owner)
- Response: 204 No Content
- Errors: 403, 404

### Bids
(DTOs: `PlaceBidRequest`, `BidResponse`, `BidSummaryResponse`)

#### POST /api/auctions/{auctionId}/bids
- Auth: required
- Path: `auctionId` (long)
- Request: `PlaceBidRequest` `{ "amount": decimal }`
- Response: `BidResponse` — 201 Created
- Errors: 400 validation, 400/409 if bid invalid (too low/auction closed), 401

#### GET /api/auctions/{auctionId}/bids
- Auth: public
- Query: `page`, `size`
- Response: `Page<BidSummaryResponse>` — 200 OK

### Wallet
(DTOs: `WalletResponse`, `DepositRequest`, `WithdrawRequest`, `WalletTransactionResponse`)

#### GET /api/wallet/me
- Auth: required
- Response: `WalletResponse` — 200 OK

#### POST /api/wallet/me/deposit
- Auth: required
- Request: `DepositRequest` `{ "amount": decimal }`
- Response: `WalletTransactionResponse` — 201 Created
- Errors: 400 validation

#### POST /api/wallet/me/withdraw
- Auth: required
- Request: `WithdrawRequest` `{ "amount": decimal }`
- Response: `WalletTransactionResponse` — 201 Created
- Errors: 400 validation, 400 Insufficient Balance (details: `currentBalance`, `requestedAmount`)

#### GET /api/wallet/me/transactions
- Auth: required
- Query: `page`, `size`
- Response: `Page<WalletTransactionResponse>` — 200 OK

### Notifications

#### GET /api/notifications
- Auth: required
- Query: `page`, `size`
- Response: `Page<NotificationResponse>` — 200 OK

#### PUT /api/notifications/{id}/read
- Auth: required
- Path: `id` (long)
- Response: 204 No Content

---

## Next steps / Options
- ถ้าต้องการผมสามารถแปลงเป็น OpenAPI (YAML) หรือสร้าง `API_DOCUMENTATION.md` เวอร์ชันภาษาอังกฤษ/ตัวอย่างเพิ่มเติมได้
- ไฟล์ config และ handler ที่อ้างอิง: [backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java](backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java#L1-L200), [backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java](backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java#L1-L400)
