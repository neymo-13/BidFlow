# Design — BidFlow Frontend (รอบที่ 1) + Design v2 (รอบที่ 2) + Design v3 (รอบที่ 3)
วันที่: 2026-09-28 · v1 อ้างอิง requirements v2 (อนุมัติแล้ว — GATE 2) · v2 (หัวข้อ 11) อ้างอิง requirements v3 (อนุมัติแล้ว — GATE 2, D-011) · v3 (หัวข้อ 12) อ้างอิง requirements v4 (อนุมัติแล้ว — GATE 2, D-027)

## 1. ภาพรวมสถาปัตยกรรม / โครงโมดูล

ทำงานบนโครงเดิมของ `frontend/` (Next.js 16 App Router) ทุกหน้าที่เพิ่มเป็น Client Component (`"use client"`)
เพราะ token อยู่ใน localStorage ฝั่ง server จึงเรียก API ที่ต้องล็อกอินไม่ได้

```
Browser ──► app/<route>/page.tsx (client)
              ├─ RequireAuth (components/auth/auth-guard.tsx)   ← หน้าที่ต้องล็อกอิน
              ├─ lib/api/* (axios + JWT interceptor เดิม)        ──► Spring Boot :8081
              ├─ lib/store/auth-store.ts (เดิม)  · notification-store.ts (ใหม่)
              └─ components/ui/* (shadcn base-ui เดิม) + components ใหม่
```

**ไฟล์ใหม่**
| ไฟล์ | หน้าที่ |
|---|---|
| `app/wallet/page.tsx` | FR-01 หน้า Wallet |
| `app/profile/page.tsx` | FR-07 หน้า Profile |
| `app/notifications/page.tsx` | FR-06 รายการ notification ทั้งหมด |
| `app/auctions/page.tsx` (ตอนนี้ว่าง) | FR-08 รายการ auction + filter status + แบ่งหน้า |
| `app/auctions/create/page.tsx` | FR-02 ฟอร์มสร้าง |
| `app/auctions/my/page.tsx` | FR-03 dashboard ผู้ขาย |
| `app/auctions/[id]/edit/page.tsx` | FR-03 แก้ไข DRAFT |
| `components/auth/auth-guard.tsx` (ตอนนี้ว่าง) | FR-10 `RequireAuth` |
| `components/auction/auction-form.tsx` | ฟอร์มที่ใช้ร่วมกันระหว่างหน้าสร้างและหน้าแก้ไข |
| `components/common/pagination.tsx` | ปุ่ม Prev / Page x of y / Next |
| `components/notification/notification-bell.tsx` | FR-06 กระดิ่ง + dropdown ใน navbar |
| `components/ui/textarea.tsx` | textarea สไตล์เดียวกับ `input.tsx` (เขียนเอง ไม่รัน shadcn CLI) |
| `lib/store/notification-store.ts` | unread count + รายการล่าสุด + polling |
| `lib/redirect.ts` | `safeRedirect()` กัน open redirect |

**ไฟล์ที่แก้**
| ไฟล์ | การแก้ |
|---|---|
| `components/layout/navbar.tsx` | ใส่กระดิ่ง, เพิ่มเมนูสำหรับมือถือ |
| `app/login/page.tsx` | ใช้ `safeRedirect()` กับค่า `?redirect=` |
| `components/auction/auction-card.tsx` | export `StatusBadge` ให้หน้าอื่นใช้ซ้ำ |
| `lib/format.ts` | เพิ่มตัวแปลง `datetime-local` ↔ ISO |
| `lib/api/*`, `lib/types.ts` | normalize JSON ของ Page (ถ้าเช็คแล้วพบว่าต่างจาก type) และแก้ชื่อ field ให้ตรง API จริง |

## 2. การเลือกเทคโนโลยี / แนวทาง (ADR-lite)

| # | เรื่อง | ทางเลือก | แนะนำ | เหตุผล |
|---|---|---|---|---|
| DS-1 | วิธีดึงข้อมูล | **A.** `useEffect` + `useState` ในแต่ละหน้า (แบบเดิม) · **B.** เพิ่ม SWR / TanStack Query | **A** | ตรง convention เดิม และไม่เพิ่ม dependency (NFR-06) ส่วน polling เขียนเองได้ง่าย |
| DS-2 | การบังคับล็อกอิน | **A.** `RequireAuth` ฝั่ง client ใช้ `useRequireAuth` เดิม · **B.** `proxy.ts` (Next 16) | **A** | `proxy` อ่าน localStorage ไม่ได้ ต้องย้าย token ไป cookie ซึ่งอยู่นอกขอบเขต ส่วนความปลอดภัยจริงอยู่ที่ backend อยู่แล้ว |
| DS-3 | แก้ไข DRAFT | **A.** หน้าแยก `/auctions/[id]/edit` ใช้ `AuctionForm` ร่วมกับหน้าสร้าง · **B.** Dialog ในหน้า My Auctions | **A** | ฟอร์มยาว หน้าแยกใช้บนมือถือได้ดีกว่า และใช้โค้ดฟอร์มซ้ำได้ 100% |
| DS-4 | ตัวเลือก status ในหน้า `/auctions` | **A.** Live · Ended · **B.** Live · Ended · Cancelled | **A** | ผู้ซื้อไม่ได้ประโยชน์จากรายการที่ยกเลิก และจะ**ไม่มีตัวเลือก "All"** เพราะ API จะดึง DRAFT ของทุกคนมาด้วย |
| DS-5 | ฟอร์มและ validation | **A.** controlled state + ฟังก์ชัน validate เขียนเอง · **B.** react-hook-form + zod | **A** | ตรงกับหน้า login/register เดิมและไม่เพิ่ม dependency |
| DS-6 | ตัวเลือก status ใน UI | ใช้ `Tabs` ที่มีอยู่ ทั้งหน้า `/auctions` และ My Auctions | — | ไม่ต้องเพิ่ม component Select |

## 3. Data model (ฝั่ง client)
ใช้ type เดิมใน `lib/types.ts` แต่ **ต้องเช็คกับ API จริงใน U0 ก่อน**:
- **`Page<T>`:** type เดิมคาดว่า `totalPages`, `number`, `first`, `last` อยู่ชั้นบนสุด ถ้า API ส่งเป็น `{ content, page: { size, number, totalElements, totalPages } }` จะเพิ่ม `normalizePage()` ใน `lib/api` ให้คืนรูปแบบเดิมเสมอ
- **`Notification.isRead`:** เช็คว่า JSON ใช้ชื่อ `isRead` หรือ `read` แล้วแก้ type หรือ map ให้ตรง
- **Notification store (zustand):** `{ items: Notification[], unreadCount: number, isLoading, fetchLatest(), markRead(id), reset() }`

## 4. Interface (API ที่ใช้ — มีอยู่แล้วทั้งหมด ไม่แก้ backend)
| หน้า | Endpoint |
|---|---|
| Wallet | `GET /api/wallet/me` · `POST /api/wallet/me/deposit` · `POST /api/wallet/me/withdraw` · `GET /api/wallet/me/transactions?page&size` |
| Profile | `GET /api/users/me` |
| `/auctions` | `GET /api/auctions?status&page&size` |
| Create | `POST /api/auctions` |
| My Auctions / Edit | `GET /api/auctions/my?page&size` · `GET /api/auctions/{id}` · `PUT /api/auctions/{id}` · `DELETE /api/auctions/{id}` |
| Notifications | `GET /api/notifications?page&size` · `PUT /api/notifications/{id}/read` |

**URL ของหน้า `/auctions`:** `/auctions?status=ACTIVE|ENDED&page=<0..>` ถ้าค่าไม่ถูกต้องจะใช้ค่าเริ่มต้น (`ACTIVE`, `0`)

## 5. UI/UX
**สไตล์:** ต่อจากของเดิม คือสะอาด สว่าง การ์ดมุมโค้ง และใช้ไอคอน lucide
| Token | ค่า | ใช้กับ |
|---|---|---|
| Primary | `#2563EB` (blue-600) | ปุ่มหลัก, ลิงก์ |
| Money | `#059669` (emerald-600) / พื้น `#ECFDF5` | ยอดเงิน, รายการเงินเข้า |
| Danger | `#DC2626` (red-600) | เงินออก, ยกเลิก, error |
| Warning | `#D97706` (amber-600) | เงินที่ถูกกันไว้ในการบิด (BID_HOLD) |
| Text / BG | `#0F172A` (slate-900) / `#F8FAFC` (slate-50) | ข้อความ / พื้นหลัง |

- **Layout:** หน้าที่เป็นรายการใช้ `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` และหน้าฟอร์มใช้ `max-w-2xl`
- **Typography:** ใช้ฟอนต์ระบบเดิม หัวหน้า `text-2xl md:text-3xl font-bold tracking-tight`

**แต่ละหน้า**
- **Wallet:** การ์ดยอดเงิน (ตัวเลขใหญ่สีเขียว) → Tabs "Deposit | Withdraw" (ช่องจำนวน + ปุ่มจำนวนด่วน 1,000 / 5,000 / 10,000) → ตารางประวัติ (วันที่, ประเภท, รายละเอียด, จำนวน +/− แยกสี, ยอดคงเหลือ) + Pagination บนมือถือตารางเลื่อนแนวนอนได้เฉพาะในกรอบของตาราง
- **ป้ายประเภทธุรกรรม:** DEPOSIT "Deposit" (เขียว +) · WITHDRAW "Withdraw" (แดง −) · BID_HOLD "Bid hold" (ส้ม −) · BID_RELEASE "Bid refund" (น้ำเงิน +) · SELLER_PAYOUT "Sale payout" (เขียว +)
- **Profile:** การ์ดที่มี avatar ตัวอักษรแรก, ชื่อ, @username, email, "Member since", ยอดเงิน และปุ่มลัดไป Wallet / My Auctions / Notifications / Sell an item
- **`/auctions`:** หัวข้อ + Tabs (Live | Ended) → grid ของ `AuctionCard` เดิม (1/2/3/4 คอลัมน์ตามความกว้าง) → Pagination
- **Create / Edit:** ฟอร์มเดียวกัน ได้แก่ Title, Description (textarea), Start price, Min increment, Start time, End time (`datetime-local`) มี error ใต้แต่ละช่อง ค่าเริ่มต้นของ start = ตอนนี้ + 5 นาที และ end = start + 7 วัน หลังสร้างสำเร็จจะมี toast แล้วพาไป `/auctions/my`
  - มีข้อความ info ใต้ฟอร์มว่า "Auctions are saved as Draft. Publishing is coming soon." เพื่อไม่ให้ผู้ใช้งงว่าทำไมยังบิดไม่ได้
- **My Auctions:** Tabs All | Draft | Active | Ended | Cancelled (กรองฝั่ง client จากผลของ `/my` เพราะ API ไม่มี filter) → แถวที่แสดงชื่อ, StatusBadge, ราคาปัจจุบัน, จำนวนบิด, เวลาสิ้นสุด แถว DRAFT มีปุ่ม Edit และ Cancel (Cancel เปิด Dialog ยืนยันก่อน) ทุกแถวมีปุ่ม View
- **Notification bell:** ไอคอน `Bell` + badge ตัวเลขสีแดง (แสดง 9+ ถ้าเกิน) เปิด dropdown แสดง 5 รายการล่าสุด (ถ้ายังไม่อ่านจะมีจุดสีน้ำเงินและตัวหนา) พร้อมลิงก์ "View all" ไป `/notifications` เมื่อคลิกรายการจะ mark read แล้วพาไป `/auctions/{auctionItemId}` (ถ้ามี)
- **`/notifications`:** รายการเต็มแบบแบ่งหน้า มีปุ่ม "Mark as read" ต่อรายการ
- **Navbar บนมือถือ:** dropdown ของผู้ใช้เพิ่ม "Browse auctions" และ "Sell an item" (แสดงเฉพาะ `md:hidden` เพราะลิงก์บนแถบซ่อนอยู่บนมือถือ)

## 6. Error handling & edge cases
- ทุกหน้ามี 3 สถานะ: **loading** (Skeleton/Spinner เดิม) · **empty** (ข้อความ + ปุ่มพาไปทำต่อ) · **error** (ข้อความจาก `getErrorMessage` + ปุ่ม Retry)
- error ของแต่ละช่องจาก backend: ถ้า `ApiError.details` มี key ตรงกับชื่อช่องจะแสดงใต้ช่องนั้น ที่เหลือแสดงเป็น error รวมด้านบน
- **401:** ใช้ interceptor เดิม (ล้าง token แล้วไป `/login`) · **403** ตอนแก้ไข: แสดง "You can't edit this auction" · **400** จาก status ที่ไม่ใช่ DRAFT: แสดงข้อความจาก backend
- **จำนวนเงิน:** ต้อง > 0, ทศนิยมไม่เกิน 2 ตำแหน่ง, ไม่เกิน 10,000,000 ต่อรายการ (กัน DECIMAL overflow ที่ backend ยังไม่ได้กัน) [ASSUMED] และตอนถอนเช็คว่าไม่เกินยอดฝั่ง client ด้วย (server ยังเป็นตัวตัดสิน)
- **เวลา:** start ต้องไม่อยู่ในอดีต และ end ต้องมากกว่า start แปลงเป็น ISO (UTC) ด้วย `toISOString()` ก่อนส่ง
- **หน้า Edit:** ถ้าไม่ใช่เจ้าของหรือไม่ใช่ DRAFT จะแสดงข้อความแทนฟอร์ม (ข้อมูลเจ้าของเช็คจาก `sellerUsername` และ backend ตรวจซ้ำ)
- **Notification ที่ `auctionItemId = null`:** คลิกแล้วแค่ mark read ไม่เปลี่ยนหน้า
- **Polling:** เริ่มเฉพาะตอนมี user หยุดตอน logout และข้ามรอบถ้าแท็บถูกซ่อน (`document.hidden`) เพื่อลด request
- **Query ที่ผิดใน URL** (`?page=-1`, `?status=DRAFT`) จะใช้ค่าเริ่มต้นแทน

## 7. Security & Privacy
- `RequireAuth` ใช้เพื่อ UX เท่านั้น การตรวจสิทธิ์จริงอยู่ที่ backend (JWT + ownership check) ซึ่งมีอยู่แล้ว
- `safeRedirect(value)`: รับเฉพาะค่าที่ขึ้นต้นด้วย `/` แต่ไม่ขึ้นต้นด้วย `//` หรือ `/\` และไม่มี scheme ถ้าไม่ผ่านจะใช้ `/` (AC-18)
- แสดงข้อความ notification และชื่อ auction เป็นข้อความผ่าน React เท่านั้น ห้ามใช้ `dangerouslySetInnerHTML` (ชื่อ auction มาจากผู้ใช้)
- ไม่ log token หรือข้อมูลผู้ใช้ใน console
- ไม่เพิ่ม dependency

## 8. กลยุทธ์ทดสอบ
**สภาพแวดล้อม:** เปิด Docker Desktop → compose (backend 8081, Postgres 5433) → หยุด `open-webui` ชั่วคราวเพื่อให้พอร์ต 3000 ว่าง → `npm run dev` (ต้องขออนุมัติใน GATE 2)

| AC | วิธีตรวจ | ใครตรวจ |
|---|---|---|
| AC-01–03 | curl เทียบ API (ยอด/ประวัติก่อนและหลังฝาก-ถอน) + route ตอบ 200 + ผู้ใช้ลองกดใน browser | AI + ผู้ใช้ |
| AC-04–05 | curl สร้างผ่าน API ด้วย payload เดียวกับฟอร์ม + ทดสอบฟังก์ชัน validate ด้วยค่าผิด + ผู้ใช้ลองกรอก | AI + ผู้ใช้ |
| AC-06–07 | curl PUT/DELETE กับ DRAFT + ผู้ใช้ลองกดใน dashboard | AI + ผู้ใช้ |
| AC-10 | ใส่ notification ทดสอบ 2 แถวลง DB ของ dev (`docker exec … psql INSERT`) แล้วดู badge และลองคลิก | AI + ผู้ใช้ |
| AC-11–12 | route ตอบ 200 + ผู้ใช้เปิดดู / refresh แล้ว filter ยังอยู่ | AI + ผู้ใช้ |
| AC-15–16 | curl ทุก route ต้องได้ 200 (ไม่มี 404/500) + ผู้ใช้ลองเปิดตอนยังไม่ล็อกอิน | AI + ผู้ใช้ |
| AC-17 | `npx tsc --noEmit` · `npx eslint` · `npm run build` | AI |
| AC-18 | ทดสอบ `safeRedirect` กับชุดค่า (`/wallet`, `//evil.com`, `https://x`, `/\evil`) + ผู้ใช้ลอง URL จริง | AI + ผู้ใช้ |

> ผมตรวจการกดใน browser เองไม่ได้ ข้อที่ต้องกดจริงจะมีขั้นตอนให้ผู้ใช้ทดสอบที่ GATE 3

## 9. แผนหน่วยงาน (Units)
| Unit | เนื้องาน | Req ที่รองรับ | ตรวจด้วย |
|------|----------|--------------|----------|
| U0 | ฐาน: เช็ค JSON จริง (Page, isRead) + normalize · `safeRedirect` + แก้ login · `RequireAuth` · `Pagination` · `Textarea` · ตัวแปลงเวลา · export `StatusBadge` | FR-10, NFR-05 | tsc, eslint, ทดสอบ `safeRedirect` |
| U1 | หน้า Wallet | FR-01 | AC-01–03 |
| U2 | หน้า Profile | FR-07 | AC-11 |
| U3 | หน้า `/auctions` (Tabs + Pagination + URL query + Suspense) | FR-08 | AC-12 |
| U4 | `AuctionForm` + หน้า Create | FR-02 | AC-04–05 |
| U5 | My Auctions + หน้า Edit + Dialog ยืนยัน Cancel | FR-03 | AC-06–07 |
| U6 | notification store + กระดิ่ง + หน้า `/notifications` | FR-06 | AC-10 |
| U7 | รวม navbar (กระดิ่ง + เมนูมือถือ) + ไล่เช็คทุก route | FR-10, FR-11 | AC-15–16 |
| U8 | ตรวจรวม: `next build` + eslint · อัปเดต `frontend/README.md` + `.env.example` · `traceability.md` | NFR-04 | AC-17 |

## 10. ตารางตามรอย Req → ดีไซน์
| Req | ดีไซน์ | Unit |
|---|---|---|
| FR-01 | §4 Wallet, §5 Wallet, §6 จำนวนเงิน | U1 |
| FR-02 | §2 DS-5, §5 Create/Edit, §6 เวลา | U4 |
| FR-03 | §2 DS-3, §5 My Auctions, §6 หน้า Edit | U5 |
| FR-06 | §3 store, §5 bell + `/notifications`, §6 polling | U6 |
| FR-07 | §5 Profile | U2 |
| FR-08 | §2 DS-4/6, §4 URL, §6 query ผิด | U3 |
| FR-10 | §2 DS-2, §7 | U0, U7 |
| FR-11 | §5 Navbar | U7 |
| NFR-01 | §5 layout + เมนูมือถือ | ทุก unit |
| NFR-02 | §6 สามสถานะ | ทุก unit |
| NFR-03 | §1, §2 | ทุก unit |
| NFR-04 | §8 | U8 |
| NFR-05 | §7 | U0 |
| NFR-06 | §2 DS-1/5, §7 | ทุก unit |

---

## 11. Design v2 — รอบที่ 2 (backend + frontend)

### 11.1 การตัดสินใจ (ADR-lite)
| # | เรื่อง | ทางเลือก | แนะนำ | เหตุผล |
|---|---|---|---|---|
| DS-7 | Publish | **A.** `POST /api/auctions/{id}/publish` (เจ้าของ + DRAFT + endTime ยังไม่ผ่าน) · **B.** scheduler เปิดให้เองเมื่อถึง startTime | **A** | B ต้องเพิ่มสถานะ SCHEDULED (แก้ enum + CHECK ใน schema) ส่วน A ไม่แตะ schema เลย และระบบกันการบิดก่อน startTime อยู่แล้ว (`BidService`) |
| DS-8 | ค้นหา / เรียง | JPA Specification (`JpaSpecificationExecutor` มีใน Spring Data อยู่แล้ว) | — | ไม่เพิ่ม dependency, เงื่อนไขประกอบกันได้, ป้องกัน SQL injection เพราะเป็น parameterized |
| DS-9 | My Bids | 1 แถวต่อ auction (GROUP BY) · ตัดสิน Leading จาก `myMax == currentPrice` | — | บิดใหม่ต้องสูงกว่าราคาเดิมเสมอ บิดสูงสุดจึงไม่ซ้ำกัน ไม่ต้อง query เพิ่มต่อแถว |
| DS-10a | Object storage ตอน dev | ตรวจแล้ว (2026-09-28): `minio/minio` **ดึงไม่ได้แล้ว** (Docker Hub และ quay.io ปฏิเสธ) · **A.** `adobe/s3mock` — เบา ตั้งค่าน้อย ดูแลต่อเนื่อง แต่เป็น mock ที่ไม่ตรวจ credentials · **B.** `bitnamilegacy/minio` — MinIO จริงพร้อมหน้าเว็บ console แต่ image ไม่ได้รับอัปเดตแล้ว · **C.** SeaweedFS — storage จริง ดูแลต่อเนื่อง แต่ตั้งค่ามากกว่า | **A** | ทุกทางเลือกใช้โค้ด AWS SDK ชุดเดียวกัน ตอน demo/deploy สลับไป **AWS S3** ด้วย env var อย่างเดียว · A ตั้งค่าน้อยที่สุด (สร้าง bucket ให้เองผ่าน env) |
| DS-10b | วิธีอัปโหลด | **A.** อัปโหลดผ่าน backend (multipart) แล้ว backend ส่งต่อ S3 · **B.** presigned PUT ให้ browser อัปตรงเข้า bucket | **A** | backend ตรวจชนิดไฟล์จาก**เนื้อไฟล์จริง**ได้ก่อนเก็บ, ไม่ต้องตั้ง CORS ของ bucket, ไม่มีไฟล์ค้างถ้าอัปไม่จบ · ไฟล์ ≤ 5 MB ไม่หนัก backend |
| DS-10c | การแสดงรูป | **A.** bucket แบบ private + presigned GET URL (อายุ 60 นาที) ใน response ของ API · **B.** bucket แบบ public-read | **A** | AWS S3 ปิด public access เป็นค่าเริ่มต้น ใช้ A ได้เหมือนกันทั้ง MinIO และ S3 |
| DS-10d | Dependency ใหม่ | `software.amazon.awssdk:s3` (AWS SDK for Java v2 — official, ดูแลต่อเนื่อง) ผ่าน BOM | — | **ต้องขออนุมัติ** (เพิ่ม dependency) |
| DS-11 | แจ้งเตือนโดนบิดแซง | สร้าง notification ใน `BidService` ภายใน transaction เดียวกับการบิด | — | ใช้ `NotificationService` เดิม · ถ้าบิดไม่สำเร็จ notification rollback ไปด้วย |
| DS-12 | พอร์ตของเครื่องนี้ | `docker-compose.local.yml` (ใน repo แต่ gitignore) remap Postgres 5433, backend 8081, storage ไปพอร์ตที่ว่าง | — | 8080 ชนกับ Jenkins, 5432 ชนกับ PostgreSQL ในเครื่อง, 9000 ชนกับ Hadoop namenode |
| DS-13 | ไฟล์เดิมที่ต้องแก้ | หน้า detail `app/auctions/[id]/page.tsx` ต้องแก้เพื่อแสดงรูป/Publish → แก้ eslint error เดิมของไฟล์นี้ไปด้วย | — | แตะไฟล์อยู่แล้ว · ไม่ refactor ส่วนอื่น |

### 11.2 Backend — API contract (ใหม่/เปลี่ยน)
| Endpoint | สิทธิ์ | รายละเอียด |
|---|---|---|
| `GET /api/auctions?status&q&sort&page&size` | public | `status` รับแค่ `ACTIVE`, `ENDED` (ไม่ส่ง = ทั้งสอง; `DRAFT`/`CANCELLED` → 400) · `q` ค้นใน title + description แบบไม่สนตัวพิมพ์ ตัดช่องว่าง ≤ 100 ตัวอักษร และ escape `%` `_` `\` · `sort` = `newest` (ค่าเริ่มต้น) \| `endingSoon` \| `priceAsc` \| `priceDesc` \| `mostBids` (ค่าอื่น → 400) · `size` สูงสุด 50 |
| `GET /api/auctions/{id}` | public | DRAFT / CANCELLED → **404** ถ้าคนเรียกไม่ใช่เจ้าของ (FR-13) · เพิ่ม `images[]` |
| `POST /api/auctions/{id}/publish` | เจ้าของ | 200 `AuctionResponse` (ACTIVE) · ไม่ใช่เจ้าของ 403 · ไม่ใช่ DRAFT 400 · endTime ผ่านแล้ว 400 · startTime ผ่านแล้วได้ (เริ่มทันที) |
| `GET /api/bids/me?page&size` | ล็อกอิน | Page ของ `MyBidResponse { auctionId, title, status, currentPrice, endTime, myHighestBid, myBidCount, lastBidAt, result, primaryImageUrl }` · `result` = `LEADING` \| `OUTBID` \| `WON` \| `LOST` \| `CANCELLED` · เรียงตามบิดล่าสุดก่อน |
| `POST /api/auctions/{id}/images` (multipart `file`) | เจ้าของ + DRAFT | 201 `AuctionImageResponse { id, url, isPrimary, displayOrder }` · ตรวจ magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF…WEBP`) · ≤ 5 MB · ≤ 5 รูป · รูปแรกเป็น primary · key = `auctions/{id}/{uuid}.{ext}` |
| `DELETE /api/auctions/{id}/images/{imageId}` | เจ้าของ + DRAFT | 204 · ลบ object ใน bucket ด้วย · ถ้าลบ primary รูปถัดไปจะเป็น primary แทน |
| `AuctionSummaryResponse` | — | เพิ่ม `startTime`, `primaryImageUrl` (ดึง primary ของทั้งหน้าใน query เดียว ไม่เกิด N+1) |
| `AuctionResponse` | — | เพิ่ม `images: AuctionImageResponse[]` |

**Config ใหม่** (`app.storage.*` อ่านจาก env ไม่มีค่าลับในโค้ด):
`STORAGE_BUCKET` · `STORAGE_REGION` · `STORAGE_ENDPOINT` (ว่าง = AWS S3) · `STORAGE_PUBLIC_ENDPOINT` (host ที่ browser ใช้ใน presigned URL) · `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` (ว่าง = ใช้ AWS default credentials เช่น IAM role) · `STORAGE_PATH_STYLE`
- backend สร้าง bucket เองตอนเริ่มถ้ายังไม่มี (ถ้าล้มเหลวแค่ log เตือน ไม่ทำให้แอปล่ม)
- `spring.servlet.multipart.max-file-size=5MB`
- docker-compose: เพิ่ม service storage ตาม DS-10a (ชื่อ service `object-storage`) + volume และส่ง env ให้ backend (ใช้ค่าสำหรับ dev เท่านั้น แบบเดียวกับ Postgres)

### 11.3 Frontend
| ส่วน | การเปลี่ยน |
|---|---|
| types / api | `AuctionSummary.startTime/primaryImageUrl`, `Auction.images`, `MyBid`, `AuctionSort` · `auctionApi.list({status,q,sort,page})`, `publish`, `uploadImage`, `deleteImage` · `bidApi.getMyBids` |
| `/auctions` | ช่องค้นหา (debounce 400ms) + ตัวเลือกการเรียง (`<select>` แต่งให้เข้ากับ UI) → เก็บใน URL `?q=&sort=` |
| `AuctionCard` | ใช้ `primaryImageUrl` ถ้าไม่มีแสดง placeholder กลางๆ (เลิกใช้ picsum) · แสดง "Starts in …" ถ้ายังไม่ถึง startTime |
| หน้า detail | แกลเลอรี (รูปใหญ่ + thumbnail) · "Starts in …" และปิดฟอร์มบิดก่อนเวลาเริ่ม · เจ้าของเห็น DRAFT พร้อมปุ่ม Edit / Publish · แก้ eslint error เดิม (DS-13) |
| Create | เลือกรูปได้สูงสุด 5 รูป (preview + ตรวจชนิดและขนาดฝั่ง client) → สร้าง auction แล้วอัปโหลดทีละรูป ถ้ามีรูปไหนล้มเหลวจะแจ้งเตือนและพาไปหน้า Edit ให้ลองใหม่ |
| Edit | จัดการรูป (เพิ่ม/ลบ) + ปุ่ม Publish |
| My Auctions | thumbnail + ปุ่ม Publish ในแถว DRAFT (มี Dialog ยืนยันว่า "หลัง publish จะแก้ไขไม่ได้") |
| `/bids` | หน้า My Bids: การ์ด/แถวพร้อมรูป, ป้ายผล (Leading เขียว / Outbid ส้ม / Won ทอง / Lost เทา), ราคาของฉันเทียบราคาปัจจุบัน, ปุ่ม "Bid again" ถ้า Outbid และยัง ACTIVE · ลิงก์ใน navbar, dropdown และ Profile |

### 11.4 Security (เพิ่ม)
- อัปโหลด: ตรวจเจ้าของ + สถานะฝั่ง server, ตรวจชนิดจาก magic bytes (ไม่เชื่อ `Content-Type` หรือนามสกุลที่ client ส่งมา), จำกัดขนาดทั้งที่ Spring และในโค้ด, ตั้งชื่อ key เองด้วย UUID, เก็บ `Content-Type` ที่ตรวจแล้ว
- presigned URL อายุสั้น · bucket ไม่เป็น public · credentials มาจาก env
- DRAFT ของคนอื่น → 404 (ไม่บอกว่ามีอยู่)
- ค้นหา: parameterized ผ่าน Criteria API + escape wildcard · sort ผ่าน whitelist เท่านั้น

### 11.5 กลยุทธ์ทดสอบ (รอบที่ 2)
- **Backend:** build image ใหม่ (compile) → ทดสอบทุก endpoint ด้วย HTTP จริงตาม AC-08/09/13/14/19/20 รวมกรณี error (403/400/404) · อัปโหลดไฟล์ปลอม (ข้อความที่ตั้งนามสกุล `.jpg`) ต้องโดนปฏิเสธ · เช็คว่าไฟล์ไปอยู่ใน bucket จริง
- **ไม่รัน backend test ชุดเดิม** เพราะจะลบ DB ของ dev (backlog 3.2)
- **Frontend:** `tsc` · eslint (ไม่มี error ใหม่) · `next build` · ทุก route ตอบ 200 · การกดใน browser ให้ผู้ใช้ทดสอบที่ GATE 3

### 11.6 แผนหน่วยงาน (Units — รอบที่ 2)
แตกตามกติกาของ skill AI-DLC + Loop Engineering: 1 Unit = 1 ผลลัพธ์ที่ตรวจได้ แตะไม่เกิน ~5 ไฟล์ และแยก Unit ความเสี่ยงสูงไว้เดี่ยว
path backend ย่อจาก `backend/src/main/java/com/bidflow/backend/` · path frontend ย่อจาก `frontend/`

**Verify ร่วมของ backend ทุก Unit:** `docker compose ... up -d --build backend` ต้อง compile ผ่านและ backend start ได้ (log ไม่มี error) แล้วค่อยยิง HTTP ตาม AC
**Verify ร่วมของ frontend ทุก Unit:** `npx tsc --noEmit` ไม่มี error · `npx eslint <ไฟล์ที่แตะ>` ไม่มี error ใหม่ · route ที่เกี่ยวข้องตอบ 200

| # | Unit | Req ที่รองรับ | ไฟล์ที่คาดว่าจะแตะ | วิธีตรวจสอบ (Verify) | เกณฑ์ผ่าน | ความเสี่ยง |
|---|------|---------------|---------------------|----------------------|-----------|-----------|
| R2-B1 | ซ่อน DRAFT/CANCELLED จากคนที่ไม่ใช่เจ้าของ | FR-13, AC-19 | `service/AuctionService` · `controller/AuctionController` | HTTP: `GET /api/auctions/{id}` ของ DRAFT ในฐานะ guest / คนอื่น / เจ้าของ · `GET /api/auctions?status=DRAFT` | guest และคนอื่นได้ 404 · เจ้าของได้ 200 · `status=DRAFT` ได้ 400 | กลาง (สิทธิ์การเข้าถึง) |
| R2-B2 | ค้นหา `q` + เรียง `sort` + จำกัด `size` ≤ 50 + `startTime` ใน summary | FR-08b, AC-13 | `repository/AuctionItemRepository` · `repository/AuctionSpecifications` (ใหม่) · `service/AuctionService` · `controller/AuctionController` · `dto/AuctionSummaryResponse` | HTTP: `q` ที่มี/ไม่มีผล, ตัวพิมพ์ต่างกัน, `q=%` · `sort` ทั้ง 5 ค่า + ค่ามั่ว · `size=500` | ผลค้นหาและลำดับถูก · `q=%` ไม่คืนทุกแถว · sort มั่วได้ 400 · size ถูกตัดเหลือ 50 | กลาง |
| R2-B3 | Publish endpoint | FR-04, AC-08 | `service/AuctionService` · `controller/AuctionController` | HTTP: เจ้าของ publish DRAFT · คนอื่น · auction ที่ไม่ใช่ DRAFT · endTime ผ่านแล้ว | 200 + ACTIVE · 403 · 400 · 400 | ต่ำ |
| R2-B4 | My Bids endpoint | FR-05, AC-09 | `repository/BidRepository` · `dto/MyBidResponse` (ใหม่) · `service/BidService` · `controller/MyBidController` (ใหม่ — `BidController` ผูก path `/api/auctions/{id}/bids` ทั้งคลาส) | HTTP: user ที่เคยบิดหลาย auction / ไม่เคยบิด / ไม่ล็อกอิน | 1 แถวต่อ auction · `result` ถูกทุกกรณี · list ว่าง · 401/403 | ต่ำ |
| R2-B5 | แจ้งเตือนเมื่อโดนบิดแซง | FR-12, AC-20 | `service/BidService` | HTTP: alice บิด → bob บิดแซง → ดู notification ของ alice · บิดซ้ำตัวเอง · บิดล้มเหลว | alice ได้ 1 รายการ · บิดแซงตัวเองไม่แจ้ง · บิดล้มเหลวไม่แจ้ง | กลาง (อยู่ใน transaction การบิด) |
| R2-B6 | Infra ของ storage: service `object-storage` ใน compose + `docker-compose.local.yml` + dependency AWS SDK | FR-09 | `backend/pom.xml` · `docker-compose.yml` · `docker-compose.local.yml` (ใหม่) · `.gitignore` | `docker compose ... config` · container storage ขึ้น · `mvn` resolve dependency ได้ (ผ่าน build image) | compose ถูกต้อง · storage ตอบ HTTP · backend build ผ่าน | กลาง (dependency ใหม่ + config หลัก) |
| R2-B7 | `StorageService` + config + สร้าง bucket ตอนเริ่ม | FR-09 | `config/StorageConfig` (ใหม่) · `service/StorageService` (ใหม่) · `application.yaml` (profile docker รับค่าจาก env เดียวกันจึงไม่ต้องแก้ `application-docker.yaml`) | build image → log ตอน start · ลิสต์ bucket ใน storage | สร้าง bucket ได้ · ถ้าต่อ storage ไม่ได้ แอปยัง start ได้และมี log เตือน | กลาง |
| R2-B8 | Endpoint อัปโหลด/ลบรูป | FR-09, AC-14 | `repository/ItemImageRepository` (ใหม่) · `dto/AuctionImageResponse` (ใหม่) · `service/AuctionImageService` (ใหม่) · `controller/AuctionController` · `exception/GlobalExceptionHandler` | HTTP: อัป jpg/png/webp จริง · ไฟล์ข้อความที่ตั้งชื่อ `.jpg` · ไฟล์ > 5 MB · รูปที่ 6 · คนอื่นอัป · auction ที่ไม่ใช่ DRAFT · ลบ primary · ตรวจว่า object อยู่ใน bucket | 201 และมี object ใน bucket · 400 · 400/413 · 400 · 403 · 400 · primary ย้ายไปรูปถัดไป และ object ถูกลบ | **สูง** (อัปโหลดไฟล์) |
| R2-B9 | URL รูปใน response (presigned GET) | FR-09 | `dto/AuctionResponse` · `dto/AuctionSummaryResponse` · `service/AuctionService` · `dto/MyBidResponse` · `service/BidService` | HTTP: `GET /api/auctions`, `/api/auctions/{id}`, `/api/bids/me` · เปิด URL ที่ได้ด้วย curl | มี `images[]` / `primaryImageUrl` · URL โหลดรูปได้ 200 · list ไม่เกิด N+1 (ดู SQL log) | ต่ำ |
| R2-F1 | types + api ของรอบที่ 2 + ช่องค้นหาและการเรียงในหน้า `/auctions` | FR-08b, AC-13 | `lib/types.ts` · `lib/api/auction.ts` · `lib/api/bid.ts` · `app/auctions/page.tsx` | verify ร่วม · `/auctions?q=watch&sort=priceAsc` ตอบ 200 | ไม่มี error · ค่าใน URL ไม่ถูกต้องใช้ค่าเริ่มต้นแทน | ต่ำ |
| R2-F2 | แก้ eslint error เดิมของหน้า detail (DS-13) | DS-13 | `app/auctions/[id]/page.tsx` | `npx eslint app/auctions/[id]/page.tsx` · `/auctions/1` ตอบ 200 | 0 error ในไฟล์นี้ · พฤติกรรมเดิมไม่เปลี่ยน | ต่ำ |
| R2-F3 | ปุ่ม Publish (My Auctions / Edit / detail) + "Starts in…" | FR-04, AC-08 | `app/auctions/my/page.tsx` · `app/auctions/[id]/edit/page.tsx` · `app/auctions/[id]/page.tsx` · `components/auction/auction-card.tsx` · `lib/format.ts` | verify ร่วม · กดจริงให้ผู้ใช้ทดสอบที่ GATE 3 | ไม่มี error · route 200 | ต่ำ |
| R2-F4 | หน้า My Bids `/bids` + ลิงก์ใน navbar และ Profile | FR-05, AC-09 | `app/bids/page.tsx` (ใหม่) · `components/layout/navbar.tsx` · `app/profile/page.tsx` | verify ร่วม · `/bids` ตอบ 200 | ไม่มี error · route 200 | ต่ำ |
| R2-F5 | เลือก/อัปโหลดรูปในหน้า Create และ Edit | FR-09, AC-14 | `lib/image-file.ts` (ใหม่ — ตรวจชนิด/ขนาดฝั่ง client) · `components/auction/image-manager.tsx` (ใหม่) · `app/auctions/create/page.tsx` · `app/auctions/[id]/edit/page.tsx` | verify ร่วม · สคริปต์ทดสอบ `lib/image-file.ts` ใน scratchpad | ไม่มี error · ทดสอบผ่านทุกเคส | กลาง |
| R2-F6 | แสดงรูปจริงในการ์ด / detail (แกลเลอรี) / My Auctions / My Bids แทน picsum | FR-09 | `components/auction/auction-card.tsx` · `app/auctions/[id]/page.tsx` · `app/auctions/my/page.tsx` · `app/bids/page.tsx` | verify ร่วม · ไม่มี `picsum` เหลือในโค้ด | ไม่มี error · route 200 | ต่ำ |
| R2-V | ตรวจรวม: `next build`, eslint ทั้งโปรเจกต์, README (frontend + backend), `API_DOCUMENTATION.md`, `traceability.md` | AC-21 | `frontend/README.md` · `backend/README.md` · `API_DOCUMENTATION.md` · `docs/traceability.md` | `npm run build` · `npx eslint .` · เทียบ README กับคำสั่งรันจริง | build ผ่าน · ไม่มี eslint error ใหม่ · เอกสารตรงกับโค้ด | ต่ำ |

## 12. Design v3 — รอบที่ 3 (Category, Admin, Google sign-in)
อ้างอิง requirements v4 หัวข้อ 11 (FR-14…22, NFR-08…12, AC-22…32)

### 12.1 สิ่งที่พบจากโค้ดเดิมและกระทบดีไซน์
- schema มาจาก `init-scripts/schema.sql` (รันครั้งเดียวตอน volume ว่าง) + `ddl-auto: validate` → ไม่มีเครื่องมือ migration
- `ROLE_USER` ถูก hard-code ใน `User.getAuthorities()` และ `JwtAuthFilter` · filter โหลด user จาก DB ทุก request อยู่แล้ว
- การบิดใช้ Redisson lock `auction:bid:{id}` + `TransactionTemplate` · การปิด auction (`AuctionSettlementExecutor`) **ไม่ใช้ lock** แต่ `AuctionItem` มี `@Version` (optimistic lock) กันการเขียนทับ
- กันเงินเฉพาะบิดสูงสุดของ auction (`BID_HOLD`) และคืนเมื่อโดนแซง (`BID_RELEASE`)
- `GlobalExceptionHandler` มีตัวจับ `Exception` ทั่วไป → `ResponseStatusException` และ `ObjectOptimisticLockingFailureException` จะกลายเป็น 500 ถ้าไม่เพิ่มตัวจับ
- ยังไม่มี `.env` / `.env.example` ที่ root (compose อ่าน `.env` ที่ root เองอัตโนมัติ และ `.env` อยู่ใน `.gitignore` แล้ว)

### 12.2 การตัดสินใจ (ADR-lite)
| # | เรื่อง | ทางเลือก | แนะนำ | เหตุผล |
|---|---|---|---|---|
| DS-14 | Migration ของ DB | **A.** Flyway (`spring-boot-starter-flyway` + `flyway-database-postgresql`) ตั้ง `baseline-on-migrate` ที่ version 1 = `schema.sql` เดิม แล้วเพิ่ม `V2__…sql` · **B.** ไฟล์ SQL ที่รันเองด้วย `psql` + แก้ `schema.sql` สำหรับ DB ใหม่ | **A** | รันเองตอน backend เริ่ม ทุกเครื่องของทีมและตอน deploy ได้ schema เดียวกัน มีประวัติใน `flyway_schema_history` · ไม่แก้ `schema.sql` (DB ใหม่: init script สร้าง v1 → Flyway baseline → รัน V2) · B ต้องจำรันเองทุกที่และมี 2 ที่ให้แก้ |
| DS-15 | รูปแบบ Google sign-in | **A.** Google Identity Services (GIS) ใน browser ได้ ID token → `POST /api/auth/google` → backend ตรวจแล้วออก JWT ของเราเหมือน login ปกติ · **B.** Authorization Code flow ที่ backend (`oauth2Login`) แล้ว redirect กลับ frontend พร้อม token | **A** | ใช้แค่ Client ID ไม่ต้องมี client secret · เข้ากับระบบ JWT แบบ stateless เดิม · B ต้องมี session เก็บ `state`, client secret และส่ง token ผ่าน URL |
| DS-16 | ตรวจ ID token ที่ backend | **A.** `spring-security-oauth2-jose` (`NimbusJwtDecoder` + JWKS ของ Google) · **B.** `google-api-client` (`GoogleIdTokenVerifier`) · **C.** เขียนเองด้วย jjwt + ดึง JWKS เอง | **A** | อยู่ในชุด Spring Security (version คุมโดย Boot BOM — Spring Security 7.1.1) · B ดึง dependency เพิ่มเยอะ (Guava, HTTP client) · C เสี่ยงผิดพลาดด้าน security |
| DS-17 | ปุ่ม Google ฝั่ง frontend | **A.** โหลด script GIS (`https://accounts.google.com/gsi/client`) ด้วย `next/script` + component ของเราเอง พร้อม type เท่าที่ใช้ (ไม่ใช้ `any`) · **B.** แพ็กเกจ `@react-oauth/google` | **A** | ไม่เพิ่ม dependency npm · ทั้งสองทางโหลด script จาก Google ตอนรันเหมือนกัน |
| DS-18 | เก็บ role | **A.** คอลัมน์ `users.role` ค่า `USER` / `ADMIN` (enum `Role`) · **B.** ตาราง roles แบบ many-to-many | **A** | requirement มีแค่ 2 role และ 1 คนมี 1 role · B ซับซ้อนเกินจำเป็น |
| DS-19 | ตรวจสิทธิ์ admin | **A.** กฎ URL `/api/admin/**` → `hasRole("ADMIN")` ใน `SecurityConfig` · **B.** `@PreAuthorize` ทีละ method | **A** | ที่เดียวครอบทุก endpoint admin ที่จะเพิ่มในอนาคต ตรงกับสไตล์ `SecurityConfig` เดิม · authority มาจาก role ใน DB (ไม่เชื่อ claim ใน JWT) |
| DS-20 | ระงับแล้วมีผลทันที (NFR-09) | ตรวจ `suspended` ใน `JwtAuthFilter` ที่โหลด user จาก DB ทุก request อยู่แล้ว → ไม่ยืนยันตัวตน → 401 | — | ไม่ต้องทำ token blacklist · role ที่เปลี่ยนก็มีผลทันทีด้วยเหตุผลเดียวกัน |
| DS-21 | admin ยกเลิก auction ขณะมีคนบิด / ระบบกำลังปิด | ใช้ Redisson lock เดียวกับการบิด + `TransactionTemplate` · กันชนกับ settlement ด้วย `@Version` เดิม ถ้าชนได้ 409 "Auction changed, please retry" | — | ไม่ต้องแก้ settlement: ถ้า settlement แพ้ จะ retry รอบถัดไปแล้วเห็น CANCELLED แล้วข้าม |
| DS-22 | ค่า category ใน URL | slug (สร้างจากชื่อตอนเพิ่มหมวด **และไม่เปลี่ยนตามการแก้ชื่อ** เพื่อไม่ให้ลิงก์ที่แชร์ไว้เสีย) · ชื่อที่แปลง slug ไม่ได้ (เช่นภาษาไทย) ใช้ `category-{n}` | — | ตามที่ระบุใน requirement 11.3 |
| DS-23 | error 409 / 503 | เพิ่มตัวจับ `ResponseStatusException` ใน `GlobalExceptionHandler` (คืน status + reason) แล้วใช้กับ 403 ระงับ, 409 ซ้ำ/ใช้อยู่, 503 ไม่ได้ตั้งค่า Google | — | ไม่ต้องสร้าง exception class ใหม่ทีละตัว · ปัจจุบันตัวจับทั่วไปจะเปลี่ยนเป็น 500 |
| DS-24 | ทดสอบ Google ทั้งที่ AI login Google จริงไม่ได้ | unit test (JUnit + Mockito, **ไม่โหลด Spring context ไม่แตะ DB**) รันเฉพาะคลาสใหม่ใน container `maven:3.9-eclipse-temurin-21`: token ที่เซ็นด้วย RSA key ที่สร้างในเทสต์ (ถูกต้อง / audience ผิด / issuer ผิด / หมดอายุ / key อื่น / email ไม่ verified) + การจับคู่บัญชี (ใหม่ / เชื่อมด้วยอีเมล / sub เดิม / ถูกระงับ / อีเมลผูก Google คนอื่นแล้ว / username ชน) · HTTP จริง: ไม่ได้ตั้งค่า → 503, token มั่ว → 401 | — | ไม่เพิ่มช่องทางลัดใน production (ไม่เปิดให้ตั้ง JWKS URL เอง) · กรณีสำเร็จกับ Google จริงให้ผู้ใช้ทดสอบที่ GATE 3 |
| DS-25 | บัญชี admin สำหรับทดสอบ | สร้าง `qa_admin` ผ่าน `ADMIN_*` ใน compose override ที่อยู่ใน scratchpad (รหัสสุ่มตอนทดสอบ ไม่ commit) · จบ R3-V ปรับกลับเป็น USER ด้วย SQL | — | ไม่แตะ `.env` ของผู้ใช้ · admin จริงของผู้ใช้ตั้งเองใน `.env` |

### 12.3 Data model — `V2__categories_roles_google.sql`
```sql
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(60) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uniq_category_name_ci ON categories (LOWER(name));
-- หมวดเริ่มต้น 8 หมวด (slug: electronics, cameras, watches, fashion, collectibles, art, home-living, other)

ALTER TABLE auction_items ADD COLUMN category_id BIGINT REFERENCES categories(id);  -- ON DELETE RESTRICT (ค่าเริ่มต้น)
UPDATE auction_items SET category_id = (SELECT id FROM categories WHERE slug = 'other');
-- auction ตัวอย่างของ bob (จับด้วย seller = bob + ชื่อตรงตัว): iPhone/MacBook/AirPods → electronics, Rolex → watches, Leica → cameras
ALTER TABLE auction_items ALTER COLUMN category_id SET NOT NULL;
CREATE INDEX idx_auction_category ON auction_items (category_id);

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'));
ALTER TABLE users ADD COLUMN suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;   -- บัญชีที่สมัครผ่าน Google ไม่มีรหัสผ่าน
```
- ลำดับหมวด: ตามชื่อ โดยให้ Other อยู่ท้ายเสมอ (ไม่ต้องมีคอลัมน์ลำดับหรือ UI จัดเรียง)
- หมวด Other ระบุด้วย slug `other` ลบหรือซ่อนไม่ได้
- `spring.flyway.baseline-on-migrate: true`, `baseline-version: 1` · Flyway รันก่อน Hibernate validate เสมอ
- **ก่อนรันบน DB dev:** `pg_dump` เก็บไว้ใน scratchpad + นับแถวทุกตาราง (AC-31) · ย้อนกลับ = restore dump + revert โค้ด

### 12.4 Backend — API contract (ใหม่/เปลี่ยน)
| Endpoint | สิทธิ์ | รายละเอียด |
|---|---|---|
| `GET /api/categories` | public | `[{ id, name, slug }]` เฉพาะหมวดที่แสดงอยู่ |
| `GET /api/auctions?…&category=<slug>` | public | ใช้ร่วมกับ `status` / `q` / `sort` ได้ · slug ที่ไม่มีหรือถูกซ่อน → 400 |
| `POST /api/auctions` · `PUT /api/auctions/{id}` | เดิม | เพิ่ม `categoryId` (สร้าง: บังคับ · แก้: ไม่บังคับ) · หมวดไม่มีจริงหรือถูกซ่อน → 400 |
| `AuctionSummaryResponse` · `AuctionResponse` | — | เพิ่ม `category: { id, name, slug }` (ดึงพร้อม auction ไม่เกิด N+1) |
| `POST /api/auth/google` `{ credential }` | public | 200 `AuthResponse` เหมือน login · token ไม่ผ่าน → 401 · ถูกระงับ → 403 · อีเมลนี้ผูกกับ Google บัญชีอื่นแล้ว → 409 · ไม่ได้ตั้ง `GOOGLE_CLIENT_ID` → 503 |
| `POST /api/auth/login` | public | เดิม + รหัสผ่านถูกแต่ถูกระงับ → 403 "Account suspended" (ตรวจรหัสก่อน จึงไม่บอกสถานะกับคนที่ไม่รู้รหัส) · บัญชีที่ไม่มีรหัสผ่าน → 401 ข้อความเดิม |
| `GET /api/users/me` | ล็อกอิน | เพิ่ม `role` |
| `GET /api/admin/stats` | ADMIN | `{ totalUsers, suspendedUsers, adminUsers, auctionsByStatus: {DRAFT, ACTIVE, ENDED, CANCELLED}, totalBids, totalSales }` · `totalSales` = ผลรวม `current_price` ของ ENDED ที่มีผู้ชนะ |
| `GET /api/admin/users?q&page&size` | ADMIN | Page ของ `{ id, username, email, fullName, role, suspended, googleLinked, walletBalance, createdAt }` · `q` ค้น username / email / ชื่อ (escape wildcard) · size ≤ 50 · ใหม่สุดก่อน |
| `POST /api/admin/users/{id}/suspend` · `/unsuspend` | ADMIN | 200 ผู้ใช้ที่อัปเดต · เป้าหมายเป็น ADMIN (รวมตัวเอง) → 400 · ไม่มีจริง → 404 |
| `GET /api/admin/auctions?status&q&page&size` | ADMIN | Page ของ `AuctionSummaryResponse` ทุก status รวม DRAFT/CANCELLED ของทุกคน |
| `POST /api/admin/auctions/{id}/cancel` `{ reason }` | ADMIN | reason 1–500 ตัวอักษร · DRAFT/ACTIVE เท่านั้น (อื่นๆ → 400) · ไม่มีจริง → 404 · ชนกับการปิด auction → 409 · คืนเงินผู้นำ (`BID_RELEASE`) + แจ้งเตือนผู้ขายและผู้เคยบิดทุกคน (ผู้นำได้ข้อความว่าเงินถูกคืนแล้ว) |
| `GET /api/admin/categories` | ADMIN | `[{ id, name, slug, active, auctionCount }]` รวมหมวดที่ซ่อน |
| `POST /api/admin/categories` `{ name }` | ADMIN | 201 · ชื่อซ้ำ (ไม่สนตัวพิมพ์) → 409 · ว่าง/ยาวเกิน 50 → 400 |
| `PATCH /api/admin/categories/{id}` `{ name?, active? }` | ADMIN | 200 · slug ไม่เปลี่ยน · ซ่อน Other → 400 · ชื่อซ้ำ → 409 |
| `DELETE /api/admin/categories/{id}` | ADMIN | 204 · มี auction ใช้อยู่ → 409 · Other → 400 |

**การจับคู่บัญชี Google (FR-22)** หลังตรวจ token ผ่าน (NFR-10: ลายเซ็นจาก JWKS ของ Google, `iss` ∈ {`accounts.google.com`, `https://accounts.google.com`}, `aud` = Client ID ของเรา, `exp`, `email_verified = true`)
1. มีผู้ใช้ที่ `google_sub` ตรง → ใช้บัญชีนั้น
2. ไม่มี แต่อีเมลตรง (ไม่สนตัวพิมพ์) → เชื่อม `google_sub` เข้าบัญชีนั้น (ตามที่ผู้ใช้เลือก (a)) · ถ้าบัญชีนั้นผูก Google คนอื่นอยู่แล้ว → 409
3. ไม่มีทั้งคู่ → สร้างบัญชีใหม่: username จากส่วนหน้า @ (ตัวเล็ก, อักขระอื่นที่ไม่ใช่ `a-z0-9_` เป็น `_`, ยาว 3–40, ชนแล้วต่อ `_2`, `_3` …), `fullName` จาก `name`, ไม่มีรหัสผ่าน, wallet 10,000, role USER
4. ถูกระงับ → 403 · request ซ้อนกันตอนสร้างบัญชีครั้งแรกจนชน unique → ลองหาใหม่ 1 ครั้ง

**Admin คนแรก (FR-17)** — `AdminBootstrap` รันทุกครั้งที่เริ่มระบบ (หลัง `DataSeeder`)
- `ADMIN_USERNAME` ว่าง → log เตือนแล้วข้าม
- มี username นี้อยู่แล้ว → ตั้ง role เป็น ADMIN (ไม่แตะรหัสผ่าน) · ไม่มี → สร้างใหม่ด้วย `ADMIN_EMAIL` + bcrypt(`ADMIN_PASSWORD`) ต้องครบและรหัส ≥ 8 ตัว ไม่ครบ → log error แล้วข้าม (แอปยังเริ่มได้) · อีเมลชนกับคนอื่น → log error แล้วข้าม (ไม่ยึดบัญชีคนอื่น)
- ไม่ลดสิทธิ์ใครเอง (เอา env ออกแล้ว admin เดิมยังเป็น admin — ถอดด้วย SQL)

**Config / env ใหม่** (compose ส่งต่อจาก `.env` ที่ root ด้วย `${VAR:-}` · มี `.env.example` ใหม่ที่ root ไม่มีค่าจริง)
`ADMIN_USERNAME` · `ADMIN_EMAIL` · `ADMIN_PASSWORD` · `GOOGLE_CLIENT_ID` (backend) · `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend `.env.local` — Client ID เป็นค่าสาธารณะ)

### 12.5 Frontend
| ส่วน | การเปลี่ยน |
|---|---|
| types / api | `Role`, `User.role`, `Category`, `AdminCategory`, `AdminUser`, `AdminStats`, `category` ใน auction · `categoryApi.list` · `adminApi.*` · `authApi.google` · filter `category` ใน `auctionApi.list` |
| ฟอร์มสร้าง/แก้ | ช่อง "Category" แบบ `<select>` (สไตล์เดียวกับตัวเลือกการเรียงของรอบ 2) บังคับเลือก · ตอนแก้ ถ้าหมวดเดิมถูกซ่อนจะแสดงเป็น "(hidden)" และเลือกใหม่ได้ |
| การ์ด / detail | ชื่อหมวดตัวเล็กเหนือชื่อสินค้าในการ์ด · หน้า detail เป็น badge ที่ลิงก์ไป `/auctions?category=<slug>` |
| `/auctions` | ตัวเลือก "All categories" + หมวดที่แสดงอยู่ ข้างตัวเลือกการเรียง → `?category=` · slug ที่ไม่รู้จักใน URL ถูกตัดทิ้งฝั่ง client (ไม่ยิงให้ได้ 400) |
| Navbar | เมนู "Admin" (ไอคอน `ShieldCheck`) ใน dropdown เฉพาะ role ADMIN |
| `/admin` layout | `RequireAdmin`: ไม่ได้ login → `/login?redirect=` · login แล้วไม่ใช่ admin → การ์ด "You don't have access to this page" · แถบเมนู Dashboard / Users / Auctions / Categories |
| `/admin` | การ์ดตัวเลขตาม `stats` |
| `/admin/users` | ช่องค้นหา + ตาราง (username, ชื่อ, อีเมล, ป้าย Admin / Google / Suspended, วันที่สมัคร) + ปุ่ม Suspend / Unsuspend พร้อม Dialog ยืนยัน · แถวของ admin ไม่มีปุ่ม · แบ่งหน้าด้วย `Pagination` เดิม |
| `/admin/auctions` | tab สถานะ + ช่องค้นหา + ตาราง (รูป, ชื่อ, ผู้ขาย, หมวด, สถานะ, ราคา, จำนวนบิด, เวลาจบ) + ปุ่ม Cancel (DRAFT/ACTIVE) เปิด Dialog ที่ต้องกรอกเหตุผล และเตือนว่าบิดนำจะถูกคืนเงิน |
| `/admin/categories` | ฟอร์มเพิ่มหมวด + ตาราง (ชื่อ, slug, จำนวน auction, สถานะ) + Rename (Dialog), Hide/Show, Delete (กดไม่ได้ถ้ามี auction หรือเป็น Other พร้อมข้อความบอกเหตุผล) |
| Login / Register | ปุ่ม Google (ปุ่มมาตรฐานของ GIS `continue_with`) ใต้เส้นคั่น "or" · ไม่แสดงถ้าไม่ได้ตั้ง `NEXT_PUBLIC_GOOGLE_CLIENT_ID` · สำเร็จแล้วไปหน้า `redirect` ผ่าน `safeRedirect` เดิม · error แสดงเหมือน login ปกติ |
| ป้ายสี | Admin `violet` · Suspended `red` · Google แบบ outline เทา — ตามโทน Tailwind ที่ใช้อยู่ |

ผู้ใช้ที่ถูกระงับขณะเปิดเว็บอยู่: request ถัดไปได้ 401 → interceptor เดิมพาออกจากระบบไปหน้า login

### 12.6 Security (เพิ่ม)
- สิทธิ์ admin ตรวจที่ backend ด้วยกฎ URL + authority จาก role ใน DB ทุก request · หน้า admin ฝั่ง client เป็นแค่ UX
- admin ระงับ admin ไม่ได้ (กันล็อกตัวเองออก) · ทุกการกระทำของ admin log ระดับ INFO พร้อมชื่อ admin และเป้าหมาย (audit แบบเบา)
- Google: ตรวจ token ที่ server ครบตาม NFR-10 · ใช้ `sub` เป็นตัวตนหลัก ไม่ใช่อีเมล · ไม่มี client secret ในระบบ · Client ID ไม่ใช่ความลับ
- ความเสี่ยงที่ยอมรับ (ผู้ใช้เลือก (a)): การเชื่อมบัญชีด้วยอีเมลเปิดช่อง pre-account hijacking → บันทึกใน README
- รหัส admin มาจาก env เท่านั้น เก็บเป็น bcrypt · ไม่ log รหัสผ่านหรือ token
- ค้นหาผู้ใช้ใช้ parameterized + escape wildcard เหมือนการค้นหา auction · เหตุผลการยกเลิกแสดงเป็นข้อความธรรมดา (React escape ให้ ไม่ใช้ `dangerouslySetInnerHTML`)
- Backlog (นอกขอบเขต): rate limit ของ `/api/auth/*`

### 12.7 กลยุทธ์ทดสอบ (รอบที่ 3)
- **Migration:** `pg_dump` → นับแถวทุกตารางก่อน/หลัง → `flyway_schema_history` มี baseline 1 + V2 สำเร็จ → backend เริ่มได้ (validate ผ่าน) → regression สคริปต์รอบ 2 (list / detail / search)
- **Backend:** HTTP จริงที่ `127.0.0.1:8081` ทุก endpoint ตาม AC-22…30 รวมกรณี 400/401/403/404/409/503 · สิทธิ์ admin ทดสอบครบ 3 แบบ (ไม่ login / USER / ADMIN) กับทุก endpoint · ยกเลิก auction ที่มีบิด: เทียบยอด wallet และรายการธุรกรรมก่อน/หลัง + ยิงบิดกับยกเลิกพร้อมกันแล้วตรวจว่ายอดเงินถูกต้อง · Dashboard เทียบกับ SQL
- **Google:** ตาม DS-24 (unit test เฉพาะคลาสใหม่ + HTTP กรณีปฏิเสธ) · กรณีสำเร็จผู้ใช้ทดสอบใน browser
- **ไม่รัน backend test ชุดเดิม** (ล้าง DB dev) — ใช้ `-Dtest=<คลาสใหม่>` เท่านั้น
- **Frontend:** `tsc` · eslint (ไม่มี error ใหม่) · route ตอบ 200 · API client จริงใน Node ยิง backend (แบบรอบ 2) · `next build` ตอน R3-V · การกดใน browser ที่ GATE 3
- ข้อมูลทดสอบ: ผู้ใช้ `qa_*` เดิม + `qa_admin` (DS-25) · auction ทดสอบขึ้นต้น `[TEST]` และซ่อนเป็น CANCELLED หลังทดสอบ

### 12.8 แผนหน่วยงาน (Units — รอบที่ 3)
path ย่อเหมือนหัวข้อ 11.6 · test ย่อจาก `backend/src/test/java/com/bidflow/backend/` · verify ร่วมของ backend / frontend เหมือนหัวข้อ 11.6

| # | Unit | Req ที่รองรับ | ไฟล์ที่คาดว่าจะแตะ | วิธีตรวจสอบ (Verify) | เกณฑ์ผ่าน | ความเสี่ยง |
|---|------|---------------|---------------------|----------------------|-----------|-----------|
| R3-B1 | Flyway + migration V2 | NFR-11, AC-31 | `backend/pom.xml` · `application.yaml` · `resources/db/migration/V2__categories_roles_google.sql` (ใหม่) | ตาม 12.7 Migration | แถวเท่าเดิม · V2 สำเร็จ · backend เริ่มได้ · regression ผ่าน (**สร้าง auction จะใช้ไม่ได้ชั่วคราวจนจบ R3-B4** เพราะ `category_id` บังคับ) | **สูง** (migration + dependency) |
| R3-B2 | Entity: `Role`, `Category`, `CategoryRepository`, field ใหม่ใน `User` / `AuctionItem` | FR-14, FR-16 | `enums/Role` (ใหม่) · `entity/Category` (ใหม่) · `repository/CategoryRepository` (ใหม่) · `entity/User` · `entity/AuctionItem` | build + start (validate ผ่าน) · regression รอบ 2 | ไม่มี error · endpoint เดิมทำงานเหมือนเดิม | กลาง |
| R3-B3 | `GET /api/categories` | FR-14, FR-15 | `service/CategoryService` (ใหม่) · `controller/CategoryController` (ใหม่) · `dto/CategoryResponse` (ใหม่) · `config/SecurityConfig` | HTTP แบบไม่ login | 200 · 8 หมวด · Other อยู่ท้าย | ต่ำ |
| R3-B4 | สร้าง/แก้ auction พร้อมหมวด + `category` ใน response + seeder | FR-14, AC-22 | `dto/CreateAuctionRequest` · `dto/UpdateAuctionRequest` · `service/AuctionService` · `dto/AuctionSummaryResponse` · `dto/AuctionResponse` · `config/DataSeeder` | HTTP: สร้างแบบไม่มี / มี / หมวดซ่อน / ไม่มีจริง · แก้หมวดของ DRAFT · SQL log ของ list | 400 / 201 / 400 / 400 · 200 · ไม่เกิด N+1 | กลาง (6 ไฟล์ — 2 ไฟล์เป็น DTO) |
| R3-B5 | กรอง `category` ในหน้า list | FR-15, AC-23 | `repository/AuctionSpecifications` · `service/AuctionService` · `controller/AuctionController` | HTTP: slug ถูก + `q` + `sort` · slug มั่ว / ซ่อน | ผลกรองถูก · 400 | ต่ำ |
| R3-B6 | Role จาก DB + กฎ `/api/admin/**` + `role` ใน `/me` | FR-16, NFR-08 | `security/JwtAuthFilter` · `config/SecurityConfig` · `dto/UserResponse` · `service/AuthService` | HTTP: `/api/admin/…` แบบไม่ login / USER · ตั้ง role ADMIN ให้ `qa_bot` ชั่วคราวด้วย SQL แล้วลองใหม่ · `/api/users/me` · regression รอบ 2 | 401 / 403 / (404 เพราะยังไม่มี endpoint = ผ่านชั้นสิทธิ์) · มี `role` · endpoint เดิมไม่เปลี่ยน | **สูง** (auth) |
| R3-B7 | การระงับ: filter + login + ตัวจับ `ResponseStatusException` | FR-19, NFR-09 | `security/JwtAuthFilter` · `service/AuthService` · `exception/GlobalExceptionHandler` | ตั้ง `suspended` ให้ `qa_bidder_b` ด้วย SQL: token เดิม → 401 · login รหัสถูก → 403 · รหัสผิด → 401 · ปลดแล้ว login ได้ | ตามนั้นทุกข้อ | **สูง** (auth) |
| R3-B8 | Admin คนแรกจาก env + `.env.example` | FR-17, AC-25 | `config/AdminBootstrap` (ใหม่) · `application.yaml` · `docker-compose.yml` · `.env.example` (ใหม่ที่ root) | override ใน scratchpad: ไม่ตั้ง env / ตั้งครบ / restart ซ้ำ / username ที่มีอยู่แล้ว / อีเมลชน | ตาม AC-25 · log ไม่มีรหัสผ่าน | กลาง (config หลัก) |
| R3-B9 | Admin จัดการหมวด | FR-18, AC-26 | `controller/AdminCategoryController` (ใหม่) · `service/CategoryService` · `dto/AdminCategoryResponse` (ใหม่) · `dto/CategoryRequest` (ใหม่) | HTTP ทุกกรณีใน AC-26 ด้วย `qa_admin` + สิทธิ์ 3 แบบ | ตาม AC-26 · slug ไม่เปลี่ยนตอน rename | ต่ำ |
| R3-B10 | Admin ดู/ระงับผู้ใช้ | FR-19, AC-27 | `controller/AdminUserController` (ใหม่) · `service/AdminUserService` (ใหม่) · `dto/AdminUserResponse` (ใหม่) · `repository/UserRepository` | HTTP: ค้นหา + แบ่งหน้า · ระงับ `qa_bidder_b` → token เดิม 401 · ระงับ admin/ตัวเอง → 400 · id มั่ว → 404 | ตาม AC-27 | กลาง |
| R3-B11 | Admin ดู/ยกเลิก auction + คืนเงิน + แจ้งเตือน | FR-20, AC-28 | `controller/AdminAuctionController` (ใหม่) · `service/AdminAuctionService` (ใหม่) · `dto/CancelAuctionRequest` (ใหม่) · `repository/BidRepository` | HTTP: ยกเลิก ACTIVE ที่มีบิด (เทียบ wallet + ธุรกรรม + notification) · DRAFT · ENDED/CANCELLED · ไม่มีเหตุผล · บิดพร้อมกับยกเลิก | ตาม AC-28 · ยอดเงินรวมของทุกคนถูกต้องหลังยิงพร้อมกัน | **สูง** (เงิน) |
| R3-B12 | Admin Dashboard stats | FR-21, AC-29 | `controller/AdminStatsController` (ใหม่) · `service/AdminStatsService` (ใหม่) · `dto/AdminStatsResponse` (ใหม่) | HTTP เทียบกับ SQL | ทุกตัวเลขตรง | ต่ำ |
| R3-B13 | ตัวตรวจ Google ID token + dependency + unit test | FR-22, NFR-10 | `backend/pom.xml` · `security/GoogleTokenVerifier` (ใหม่) · `application.yaml` · test `security/GoogleTokenVerifierTest` (ใหม่) | `mvn test -Dtest=GoogleTokenVerifierTest` ใน container · build image | ทุกเคสใน DS-24 ผ่าน · build ผ่าน | **สูง** (auth + dependency) |
| R3-B14 | `POST /api/auth/google` + จับคู่บัญชี + unit test | FR-22, AC-30 | `service/GoogleAuthService` (ใหม่) · `controller/AuthController` · `dto/GoogleLoginRequest` (ใหม่) · `repository/UserRepository` · test `service/GoogleAuthServiceTest` (ใหม่) | unit test ตาม DS-24 · HTTP: ไม่ตั้งค่า → 503 · ตั้ง Client ID ทดสอบ + token มั่ว → 401 · body ว่าง → 400 | ผ่านทุกเคส | **สูง** (auth) |
| R3-F1 | types + API client ของรอบที่ 3 | ทุก FR | `lib/types.ts` · `lib/api/category.ts` (ใหม่) · `lib/api/admin.ts` (ใหม่) · `lib/api/auth.ts` · `lib/api/index.ts` | verify ร่วม + API client จริงใน Node ยิง backend | ไม่มี error · ข้อมูลตรง type | ต่ำ |
| R3-F2 | ช่อง Category ในฟอร์มสร้าง/แก้ | FR-14, AC-22 | `lib/auction-form.ts` · `components/auction/auction-form.tsx` · `lib/hooks/use-categories.ts` (ใหม่) | verify ร่วม · `/auctions/create` 200 · สคริปต์ทดสอบ validation ใน scratchpad | ไม่มี error · ไม่เลือกหมวดส่งไม่ได้ | ต่ำ |
| R3-F3 | แสดงหมวด + ตัวกรองหมวด | FR-15, AC-23 | `components/auction/auction-card.tsx` · `app/auctions/[id]/page.tsx` · `app/auctions/page.tsx` · `lib/api/auction.ts` | verify ร่วม · `/auctions?category=cameras` 200 | ไม่มี error | ต่ำ |
| R3-F4 | โครงหน้า admin + guard + Dashboard + เมนูใน navbar | FR-16, FR-21, AC-24, AC-29 | `app/admin/layout.tsx` (ใหม่) · `app/admin/page.tsx` (ใหม่) · `components/auth/auth-guard.tsx` · `components/layout/navbar.tsx` | verify ร่วม · `/admin` 200 | ไม่มี error | กลาง (การกันสิทธิ์ฝั่ง UI) |
| R3-F5 | หน้า `/admin/categories` | FR-18, AC-26 | `app/admin/categories/page.tsx` (ใหม่) | verify ร่วม | ไม่มี error · route 200 | ต่ำ |
| R3-F6 | หน้า `/admin/users` | FR-19, AC-27 | `app/admin/users/page.tsx` (ใหม่) | verify ร่วม | ไม่มี error · route 200 | ต่ำ |
| R3-F7 | หน้า `/admin/auctions` + Dialog ยกเลิก | FR-20, AC-28 | `app/admin/auctions/page.tsx` (ใหม่) · `components/admin/cancel-auction-dialog.tsx` (ใหม่) | verify ร่วม | ไม่มี error · route 200 | ต่ำ |
| R3-F8 | ปุ่ม Google ในหน้า login / register | FR-22, AC-30 | `components/auth/google-sign-in-button.tsx` (ใหม่ — รวม type ของ GIS) · `lib/store/auth-store.ts` · `app/login/page.tsx` · `app/register/page.tsx` · `frontend/.env.example` | verify ร่วม · อ่าน docs `next/script` ของ Next 16 ก่อน · ไม่ตั้ง Client ID → ไม่มีปุ่ม | ไม่มี error · route 200 | กลาง (script ภายนอก) |
| R3-V | ตรวจรวม + เอกสาร + ปรับ `qa_admin` กลับเป็น USER | AC-32 | `frontend/README.md` · `backend/README.md` · `API_DOCUMENTATION.md` · `docs/traceability.md` | `npm run build` · `npx eslint .` · regression backend รอบ 2–3 | build ผ่าน · ไม่มี eslint error ใหม่ · เอกสารตรงกับโค้ด | ต่ำ |

รวม 23 Unit — ความเสี่ยงสูง 6 (B1, B6, B7, B11, B13, B14) · กลาง 6 (B2, B4, B8, B10, F4, F8)

### 12.9 สิ่งที่ต้องอนุมัติพร้อม GATE 2
1. **Dependency ใหม่ (backend):** `spring-boot-starter-flyway`, `flyway-database-postgresql`, `spring-security-oauth2-jose` — version คุมโดย Spring Boot 4.1.1 BOM (Flyway 12.4.0, Spring Security 7.1.1) · frontend ไม่เพิ่ม dependency
2. **Migration DB dev** ตาม 12.3 (backup ด้วย `pg_dump` ก่อน) — จะหยุดยืนยันอีกครั้งก่อนรันจริงใน R3-B1
3. **แก้ config หลัก:** `backend/pom.xml`, `application.yaml`, `docker-compose.yml` + ไฟล์ใหม่ `.env.example` (root)
4. **บัญชีทดสอบ `qa_admin`** ตาม DS-25 และการตั้ง role/suspended ชั่วคราวให้ `qa_*` ด้วย SQL ระหว่างทดสอบ
5. **Autonomy รอบนี้:** Standard เหมือนเดิม (หยุดก่อน Unit เสี่ยงกลาง–สูง 12 ครั้ง) หรือ Auto (หยุดเฉพาะการกระทำย้อนกลับยาก เช่น migration และเมื่อแก้ปัญหาไม่ผ่านใน 3 รอบ)
