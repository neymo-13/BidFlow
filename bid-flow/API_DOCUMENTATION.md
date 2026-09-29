# BidFlow API Documentation

สรุป API หลักของโปรเจค BidFlow (Request / Response / Authentication / Error / HTTP status)

---

## Authentication
- Scheme: Bearer JWT ใน HTTP header `Authorization: Bearer <token>`
- ดูการตั้งค่า security ที่ [backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java](backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java#L1-L200)
- Public endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auctions`, `GET /api/auctions/{id}`, และอ่าน bids ของ auction
- Auth required: สร้าง/แก้ไข/ลบ/publish auctions, อัปโหลด/ลบรูป, `GET /api/auctions/my`, วาง bid, `GET /api/bids/me`, wallet, notifications, `GET /api/users/me`, ฯลฯ
- `GET /api/auctions/{id}` เป็น public แต่ถ้าส่ง token มาด้วย เจ้าของจะเปิด DRAFT/CANCELLED ของตัวเองได้

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
- 400 Bad Request: validation failures, `InsufficientBalanceException`, `IllegalArgumentException`, query param ผิดชนิด (เช่น `?status=FOO`), request อัปโหลดที่ไม่ใช่ multipart / ไม่มี part `file`
- 401 Unauthorized: missing/invalid token, bad credentials
- 403 Forbidden: access denied / not owner
- 404 Not Found: resource not found (`UserNotFoundException`, `AuctionNotFoundException`)
- 413 Payload Too Large: ไฟล์อัปโหลดเกิน 5 MB (`MaxUploadSizeExceededException`)
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
- 413 Payload Too Large — ไฟล์รูปใหญ่เกิน 5 MB
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
(DTOs: `CreateAuctionRequest`, `UpdateAuctionRequest`, `AuctionResponse`, `AuctionSummaryResponse`, `AuctionImageResponse`)

วงจรสถานะ: สร้างแล้วเป็น `DRAFT` → เจ้าของ publish เป็น `ACTIVE` (บิดได้เมื่อถึง `startTime`) → scheduler ปิดเป็น `ENDED` เมื่อเลย `endTime` · `DRAFT` ยกเลิกได้เป็น `CANCELLED`
`DRAFT` / `CANCELLED` เห็นได้เฉพาะเจ้าของ (คนอื่นได้ 404 และไม่อยู่ใน list)

รูปภาพ: เก็บใน object storage แบบ S3 (bucket เป็น private) · `url` ใน response เป็น **presigned URL อายุ 60 นาที** — ไม่ควรเก็บไว้ใช้ภายหลัง ให้เรียก API ใหม่เพื่อรับ URL ใหม่

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
- Query params:
  - `status` — `ACTIVE` หรือ `ENDED` (ไม่ส่ง = ทั้งสอง · `DRAFT`/`CANCELLED`/ค่าอื่น → 400)
  - `q` — ค้นใน title + description แบบไม่สนตัวพิมพ์ · ตัดช่องว่างหัวท้าย · ≤ 100 ตัวอักษร (เกิน → 400) · `%` `_` `\` ถูกค้นเป็นตัวอักษรจริง
  - `sort` — `newest` (ค่าเริ่มต้น) \| `endingSoon` \| `priceAsc` \| `priceDesc` \| `mostBids` (ค่าอื่น → 400)
  - `page` (int, default 0), `size` (int, default 20, **สูงสุด 50**)
- Response: `Page<AuctionSummaryResponse>` — 200 OK
  - `AuctionSummaryResponse`: `id`, `title`, `currentPrice`, `status`, `startTime`, `endTime`, `totalBids`, `sellerUsername`, `primaryImageUrl` (null = ไม่มีรูป)
- Errors: 400 (status/sort/q/page/size ไม่ถูกต้อง)

#### GET /api/auctions/my
- Auth: required
- Query: `page`, `size`
- Response: `Page<AuctionSummaryResponse>` — 200 OK (ทุกสถานะ รวม DRAFT/CANCELLED ของตัวเอง)

#### GET /api/auctions/{id}
- Auth: public (ส่ง token ได้ — ใช้ตัดสินว่าเป็นเจ้าของหรือไม่)
- Path: `id` (long)
- Response: `AuctionResponse` — 200 OK · มี `images: AuctionImageResponse[]` เรียงตาม `displayOrder` (รูปหลักก่อน)
- Errors: 404 ถ้าไม่มีจริง หรือเป็น DRAFT/CANCELLED ของคนอื่น (ตอบเหมือนกัน ไม่บอกว่ามีอยู่)

#### POST /api/auctions/{id}/publish
- Auth: required (owner)
- Response: `AuctionResponse` (status `ACTIVE`) — 200 OK · ถ้า `startTime` ผ่านแล้วจะบิดได้ทันที ไม่งั้นรอถึง `startTime`
- Errors: 400 (ไม่ใช่ DRAFT, `endTime` ผ่านแล้ว, ไม่พบ auction), 401, 403 (ไม่ใช่เจ้าของ)

#### POST /api/auctions/{id}/images
- Auth: required (owner, auction ต้องเป็น DRAFT)
- Request: `multipart/form-data` มี part ชื่อ `file`
  - รับเฉพาะ JPEG / PNG / WebP — **ตรวจจากเนื้อไฟล์จริง (magic bytes)** ไม่เชื่อชื่อไฟล์หรือ Content-Type ที่ส่งมา
  - ≤ 5 MB ต่อไฟล์ · ≤ 5 รูปต่อ auction · รูปแรกเป็นรูปหลัก (`isPrimary`)
- Response: `AuctionImageResponse` `{ id, url, isPrimary, displayOrder }` — 201 Created
- Errors: 400 (ชนิดไฟล์ไม่ถูก, ไฟล์ว่าง, เกิน 5 รูป, ไม่ใช่ DRAFT, ไม่ใช่ multipart), 401, 403, 413 (เกิน 5 MB)

#### DELETE /api/auctions/{id}/images/{imageId}
- Auth: required (owner, auction ต้องเป็น DRAFT)
- Response: 204 No Content · ลบไฟล์ออกจาก bucket ด้วย · ถ้าลบรูปหลัก รูปถัดไปจะเป็นรูปหลักแทน
- Errors: 400 (ไม่พบรูปใน auction นี้, ไม่ใช่ DRAFT), 401, 403

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
(DTOs: `PlaceBidRequest`, `BidResponse`, `BidSummaryResponse`, `MyBidResponse`)

#### POST /api/auctions/{auctionId}/bids
- Auth: required
- Path: `auctionId` (long)
- Request: `PlaceBidRequest` `{ "amount": decimal }`
- Response: `BidResponse` — 201 Created
- ผู้นำเดิมจะได้ notification "You've been outbid" (สร้างใน transaction เดียวกับการบิด · ขึ้นราคาตัวเองไม่แจ้ง)
- Errors: 400 validation, 400 if bid invalid (too low / not started / ended / own auction / insufficient balance), 401

#### GET /api/auctions/{auctionId}/bids
- Auth: public
- Query: `page`, `size`
- Response: `Page<BidSummaryResponse>` — 200 OK

#### GET /api/bids/me
- Auth: required
- Query: `page` (default 0), `size` (default 20, สูงสุด 50)
- Response: `Page<MyBidResponse>` — 200 OK · 1 แถวต่อ auction ที่เคยบิด เรียงตามบิดล่าสุดก่อน
  - `MyBidResponse`: `auctionId`, `title`, `status`, `currentPrice`, `endTime`, `myHighestBid`, `myBidCount`, `lastBidAt`, `result`, `primaryImageUrl`
  - `result`: `LEADING` / `OUTBID` (auction ยัง ACTIVE) · `WON` / `LOST` (ENDED) · `CANCELLED`
- Errors: 401

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
- ระบบสร้าง notification เมื่อ: โดนบิดแซง, ชนะการประมูล, ขายได้, auction จบโดยไม่มีคนบิด

#### PUT /api/notifications/{id}/read
- Auth: required
- Path: `id` (long)
- Response: 204 No Content

---

## Next steps / Options
- ถ้าต้องการผมสามารถแปลงเป็น OpenAPI (YAML) หรือสร้าง `API_DOCUMENTATION.md` เวอร์ชันภาษาอังกฤษ/ตัวอย่างเพิ่มเติมได้
- ไฟล์ config และ handler ที่อ้างอิง: [backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java](backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java#L1-L200), [backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java](backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java#L1-L400)
