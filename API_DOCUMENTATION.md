# BidFlow API Documentation

สรุป API หลักของโปรเจค BidFlow (Request / Response / Authentication / Error / HTTP status)

---

## Authentication
- Scheme: Bearer JWT ใน HTTP header `Authorization: Bearer <token>`
- ดูการตั้งค่า security ที่ [backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java](backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java#L1-L200)
- Public endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/categories`, `GET /api/auctions`, `GET /api/auctions/{id}`, และอ่าน bids ของ auction
- Auth required: สร้าง/แก้ไข/ลบ/publish auctions, อัปโหลด/ลบรูป, `GET /api/auctions/my`, วาง bid, `GET /api/bids/me`, wallet, notifications, `GET /api/users/me`, ฯลฯ
- **Admin only (role `ADMIN`):** ทุก path ใต้ `/api/admin/**` — ไม่ได้ login → 401, login แล้วแต่ไม่ใช่ admin → 403 (body ว่าง)
- Role (`USER` / `ADMIN`) อ่านจากฐานข้อมูลทุก request ไม่ได้อ่านจาก token → เปลี่ยน role แล้วมีผลทันทีกับ token เดิม
- ผู้ใช้ที่ถูกระงับ (`suspended`): token เดิมใช้ไม่ได้ทันที (endpoint ที่ต้อง login ได้ 401) และ login ได้ 403 `Account suspended` · endpoint public ยังใช้ได้
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
- 400 Bad Request: validation failures, `InsufficientBalanceException`, `IllegalArgumentException`, query param ผิดชนิด (เช่น `?status=FOO`), request อัปโหลดที่ไม่ใช่ multipart / ไม่มี part `file`, **ไม่ได้ส่ง body หรือ body ไม่ใช่ JSON ที่อ่านได้** (`Request body is missing or is not valid JSON`)
- 401 Unauthorized: missing/invalid token, bad credentials, Google credential ไม่ผ่าน
- 403 Forbidden: access denied / not owner / ไม่ใช่ admin / บัญชีถูกระงับ (ตอน login)
- 404 Not Found: resource not found (`UserNotFoundException`, `AuctionNotFoundException`, หมวดที่ไม่มีจริงในหน้า admin)
- 405 Method Not Allowed: method ที่ endpoint ไม่รองรับ (มี header `Allow`)
- 409 Conflict: ชื่อหมวดซ้ำ / หมวดที่มี auction ใช้อยู่ / อีเมลผูก Google บัญชีอื่นแล้ว / ยกเลิก auction ชนกับการบิดหรือการปิด auction
- 413 Payload Too Large: ไฟล์อัปโหลดเกิน 5 MB (`MaxUploadSizeExceededException`)
- 415 Unsupported Media Type: `Content-Type` ที่ endpoint ไม่รองรับ (มี header `Accept`)
- 503 Service Unavailable: Google sign-in ยังไม่ได้ตั้งค่า หรือดึง public key ของ Google ไม่ได้
- 500 Internal Server Error: unexpected errors

400 / 403 / 404 / 409 / 503 ที่มาจาก `ResponseStatusException` ใช้รูปแบบ `ErrorResponse` เดียวกัน (`message` = เหตุผล)

---

## HTTP status quick-reference
- 200 OK — GETs หรือ updates ที่คืนค่า body
- 201 Created — resource created (เช่น สมัคร, สร้าง auction, place bid, deposit)
- 204 No Content — delete หรือ actions ที่ไม่คืน body
- 400 Bad Request — validation / bad input / insufficient balance
- 401 Unauthorized — missing/invalid JWT หรือ bad credentials
- 403 Forbidden — สิทธิ์ไม่เพียงพอ
- 404 Not Found — resource not found
- 405 Method Not Allowed — method ผิด
- 409 Conflict — ชนกับข้อมูลที่มีอยู่ (ชื่อซ้ำ, ใช้อยู่, ทำงานพร้อมกัน)
- 413 Payload Too Large — ไฟล์รูปใหญ่เกิน 5 MB
- 415 Unsupported Media Type — `Content-Type` ผิด
- 503 Service Unavailable — Google sign-in ยังไม่ได้ตั้งค่า / ใช้ไม่ได้ชั่วคราว
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
- Errors: 400 validation, 401 bad credentials (รวมบัญชีที่สมัครผ่าน Google ซึ่งไม่มีรหัสผ่าน — ข้อความเดียวกัน), 403 `Account suspended` (ตรวจหลังรหัสผ่านถูก คนที่ไม่รู้รหัสจึงไม่รู้ว่าบัญชีถูกระงับ)

#### POST /api/auth/google
- Auth: public
- Request (`GoogleLoginRequest`): `{ "credential": "<Google ID token>" }` — ค่าที่ปุ่ม Google Identity Services ส่งให้ frontend (บังคับ, ≤ 8,192 ตัวอักษร)
- backend ตรวจ token เอง: ลายเซ็น RS256 กับ public key ของ Google · `iss` = `accounts.google.com` หรือ `https://accounts.google.com` · `aud` มี `GOOGLE_CLIENT_ID` ของเรา · ยังไม่หมดอายุ (คลาดเคลื่อนได้ 60 วิ) · มี `sub`, `email` และ `email_verified = true`
- การจับคู่บัญชี: `sub` ของ Google ตรงกับบัญชีที่เคยเชื่อม → บัญชีนั้น · ไม่ตรงแต่อีเมลตรง (ไม่สนตัวพิมพ์) → เชื่อม Google เข้าบัญชีนั้น (รหัสผ่านเดิมยังใช้ได้) · ไม่ตรงทั้งคู่ → สร้างบัญชีใหม่ (username จากส่วนหน้า @ ชนแล้วต่อ `_2`, `_3` …, ไม่มีรหัสผ่าน, wallet 10,000, role USER)
- Response: `AuthResponse` — 200 OK ทั้งบัญชีเดิมและบัญชีใหม่
- Errors: 400 (ไม่มี credential / body ผิด / อีเมลของ Google ยาวเกิน 100), 401 `Invalid Google credential`, 403 `Account suspended`, 409 (อีเมลนี้ผูกกับ Google บัญชีอื่นแล้ว / มีหลายบัญชีใช้อีเมลนี้), 503 (`GOOGLE_CLIENT_ID` ว่าง หรือดึง key ของ Google ไม่ได้)

### Users

#### GET /api/users/me
- Auth: required (Bearer)
- Request: none
- Response: `UserResponse` — 200 OK · `{ id, username, email, fullName, walletBalance, createdAt, role }` (`role` = `USER` | `ADMIN`)
- Errors: 401/403/404

### Categories

#### GET /api/categories
- Auth: public
- Response: `CategoryResponse[]` — 200 OK · `{ id, name, slug }` เฉพาะหมวดที่แสดงอยู่ เรียงตามชื่อ (ไม่สนตัวพิมพ์) และ `Other` อยู่ท้ายเสมอ
- `slug` ใช้เป็นค่าตัวกรอง `?category=` · slug สร้างครั้งเดียวตอนเพิ่มหมวด ไม่เปลี่ยนตามชื่อ

### Auctions
(DTOs: `CreateAuctionRequest`, `UpdateAuctionRequest`, `AuctionResponse`, `AuctionSummaryResponse`, `AuctionImageResponse`)

วงจรสถานะ: สร้างแล้วเป็น `DRAFT` → เจ้าของ publish เป็น `ACTIVE` (บิดได้เมื่อถึง `startTime`) → scheduler ปิดเป็น `ENDED` เมื่อเลย `endTime` · `DRAFT` ยกเลิกได้เป็น `CANCELLED` · admin ยกเลิก `DRAFT` / `ACTIVE` ได้ (ดู Admin)
ทุก auction มีหมวด 1 หมวด (`category: { id, name, slug }` ใน `AuctionResponse` และ `AuctionSummaryResponse`) — auction ที่ใช้หมวดซึ่งถูกซ่อนภายหลังยังแสดงชื่อหมวดเดิม
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
  - `categoryId` (long, **required**) — ต้องเป็นหมวดที่แสดงอยู่
- Response: `AuctionResponse` — 201 Created
- Errors: 400 validation (ไม่ส่งหมวด → `details.categoryId` = `Category is required`), 400 `Category {id} does not exist or is hidden`, 401

#### GET /api/auctions
- Auth: public
- Query params:
  - `status` — `ACTIVE` หรือ `ENDED` (ไม่ส่ง = ทั้งสอง · `DRAFT`/`CANCELLED`/ค่าอื่น → 400)
  - `q` — ค้นใน title + description แบบไม่สนตัวพิมพ์ · ตัดช่องว่างหัวท้าย · ≤ 100 ตัวอักษร (เกิน → 400) · `%` `_` `\` ถูกค้นเป็นตัวอักษรจริง
  - `sort` — `newest` (ค่าเริ่มต้น) \| `endingSoon` \| `priceAsc` \| `priceDesc` \| `mostBids` (ค่าอื่น → 400)
  - `category` — slug ของหมวดที่แสดงอยู่ (ไม่สนตัวพิมพ์ · ว่าง = ทุกหมวด · ไม่มีจริงหรือถูกซ่อน → 400) · ใช้ร่วมกับ `status` / `q` / `sort` ได้
  - `page` (int, default 0), `size` (int, default 20, **สูงสุด 50**)
- Response: `Page<AuctionSummaryResponse>` — 200 OK
  - `AuctionSummaryResponse`: `id`, `title`, `currentPrice`, `status`, `startTime`, `endTime`, `totalBids`, `sellerUsername`, `primaryImageUrl` (null = ไม่มีรูป), `category`
- Errors: 400 (status/sort/q/category/page/size ไม่ถูกต้อง)

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
- Request: `UpdateAuctionRequest` (optional/partial fields) · `categoryId` (ไม่บังคับ, > 0) — ส่ง id เดิมหรือไม่ส่ง = หมวดไม่เปลี่ยน (แม้หมวดเดิมถูกซ่อนแล้ว) · ย้ายไปหมวดที่ซ่อน/ไม่มีจริง → 400
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
- ระบบสร้าง notification เมื่อ: โดนบิดแซง, ชนะการประมูล, ขายได้, auction จบโดยไม่มีคนบิด, admin ยกเลิก auction ของเรา / auction ที่เราเคยบิด (มีเหตุผลของ admin · ผู้นำได้ข้อความว่าเงินถูกคืนแล้ว)

#### PUT /api/notifications/{id}/read
- Auth: required
- Path: `id` (long)
- Response: 204 No Content

### Admin
ทุก endpoint ต้องเป็น role `ADMIN` (ไม่ได้ login → 401 · USER → 403) · ทุกการกระทำของ admin ถูก log ระดับ INFO พร้อมชื่อ admin และเป้าหมาย
(DTOs: `AdminStatsResponse`, `AdminUserResponse`, `AdminCategoryResponse`, `CategoryRequest`, `CancelAuctionRequest`)

#### GET /api/admin/stats
- Response: `AdminStatsResponse` — 200 OK · `{ totalUsers, suspendedUsers, adminUsers, auctionsByStatus: { DRAFT, ACTIVE, ENDED, CANCELLED }, totalBids, totalSales }`
- `auctionsByStatus` มีครบทุก status (ไม่มี = 0) · `totalSales` = ผลรวม `currentPrice` ของ auction ที่ `ENDED` และมีผู้ชนะ

#### GET /api/admin/users
- Query: `q` (ค้น username / email / ชื่อ แบบไม่สนตัวพิมพ์ · ≤ 100 · `%` `_` `\` เป็นตัวอักษรจริง), `page`, `size` (≤ 50)
- Response: `Page<AdminUserResponse>` — 200 OK · ใหม่สุดก่อน · `{ id, username, email, fullName, role, suspended, googleLinked, walletBalance, createdAt }` (ไม่มี password hash / Google sub)
- Errors: 400 (q ยาวเกิน, page ติดลบ)

#### POST /api/admin/users/{id}/suspend · POST /api/admin/users/{id}/unsuspend
- Response: `AdminUserResponse` — 200 OK · ทำซ้ำได้ (ระงับคนที่ถูกระงับอยู่แล้ว = ไม่เปลี่ยน)
- ระงับแล้ว token เดิมของคนนั้นใช้ไม่ได้ทันที · ปลดแล้ว token เดิมกลับมาใช้ได้ (ถ้ายังไม่หมดอายุ)
- Errors: 400 `Admins cannot be suspended` (รวมตัวเอง), 404

#### GET /api/admin/auctions
- Query: `status` (ไม่ส่ง = ทุก status รวม DRAFT / CANCELLED ของทุกคน · ค่าผิด → 400), `q` (เหมือน `GET /api/auctions`), `page`, `size` (≤ 50)
- Response: `Page<AuctionSummaryResponse>` — 200 OK · ใหม่สุดก่อน

#### POST /api/admin/auctions/{id}/cancel
- Request (`CancelAuctionRequest`): `{ "reason": string }` — บังคับ, ≤ 500 ตัวอักษร (ตัดช่องว่างหัวท้าย)
- ยกเลิกได้เฉพาะ `DRAFT` / `ACTIVE` · ใช้ lock เดียวกับการบิด → ไม่มีบิดแทรกระหว่างยกเลิก
- ผลลัพธ์: สถานะเป็น `CANCELLED` · ถ้ามีบิดนำ คืนเงินที่ hold ไว้ให้ผู้นำ (`BID_RELEASE` คำอธิบาย `Refund: auction X cancelled by admin`) · แจ้งเตือนผู้ขายและทุกคนที่เคยบิด (มีเหตุผล)
- Response: 204 No Content
- Errors: 400 (ไม่ใส่เหตุผล / ยาวเกิน / สถานะไม่ใช่ DRAFT หรือ ACTIVE), 404, 409 (กำลังประมวลผลบิดอยู่ หรือ auction เพิ่งถูกปิด — ลองใหม่)

#### GET /api/admin/categories
- Response: `AdminCategoryResponse[]` — 200 OK · `{ id, name, slug, active, auctionCount }` รวมหมวดที่ซ่อน · `auctionCount` นับทุก status

#### POST /api/admin/categories
- Request (`CategoryRequest`): `{ "name": string }` — บังคับ, ≤ 50 (ตัดช่องว่างหัวท้าย)
- slug สร้างจากชื่อ (ตัวเล็ก, ตัดเครื่องหมายเน้นเสียง, อักขระอื่นเป็น `-`, ชนแล้วต่อ `-2` …, ชื่อที่ไม่มี a-z/0-9 เลยได้ `category`)
- Response: `AdminCategoryResponse` — 201 Created
- Errors: 400 (ว่าง / ยาวเกิน), 409 ชื่อซ้ำ (ไม่สนตัวพิมพ์)

#### PATCH /api/admin/categories/{id}
- Request (`CategoryRequest`): `{ "name"?: string, "active"?: boolean }` — ส่งเฉพาะที่เปลี่ยน · slug ไม่เปลี่ยน
- ซ่อน (`active: false`) → หายจาก `GET /api/categories`, ตัวกรอง และการสร้าง/ย้าย auction · auction ที่ใช้อยู่แล้วยังคงหมวดเดิม
- Response: `AdminCategoryResponse` — 200 OK
- Errors: 400 (ซ่อน `Other`, ชื่อว่าง/ยาวเกิน), 404, 409 ชื่อชนกับหมวดอื่น

#### DELETE /api/admin/categories/{id}
- Response: 204 No Content
- Errors: 400 (`Other` ลบไม่ได้), 404, 409 (มี auction ใช้อยู่ — ให้ซ่อนแทน)

---

## Next steps / Options
- ถ้าต้องการผมสามารถแปลงเป็น OpenAPI (YAML) หรือสร้าง `API_DOCUMENTATION.md` เวอร์ชันภาษาอังกฤษ/ตัวอย่างเพิ่มเติมได้
- ไฟล์ config และ handler ที่อ้างอิง: [backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java](backend/src/main/java/com/bidflow/backend/config/SecurityConfig.java#L1-L200), [backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java](backend/src/main/java/com/bidflow/backend/exception/GlobalExceptionHandler.java#L1-L400)
