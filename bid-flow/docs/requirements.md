# Requirements — BidFlow Frontend (รอบที่ 1) + Delta รอบที่ 2 + Delta รอบที่ 3
วันที่: 2026-09-28 · เวอร์ชัน: 4 · สถานะ: v2 อนุมัติแล้ว (GATE 1) · v3 delta อนุมัติโดยผู้ใช้ ("ทำเลยโดยแก้ backend ให้สอดคล้อง") — ดูหัวข้อ 10 · v4 delta (หัวข้อ 11) อนุมัติแล้ว 2026-09-28 (GATE 1)

> **v4 (รอบที่ 3):** ผู้ใช้เพิ่ม requirement: Category System, Admin Role, Google sign-in — ดูหัวข้อ 11

> **v3 (รอบที่ 2):** ผู้ใช้สั่งให้ทำ feature ที่เลื่อนไว้ต่อ **และอนุญาตให้แก้ backend** — FR-04, FR-05, FR-08b, FR-09 กลับเข้าขอบเขต
> พร้อมข้อเพิ่ม FR-12, FR-13 และ AC ใหม่ในหัวข้อ 10 · ข้อจำกัด "ไม่แก้ backend" ในหัวข้อ 6 ใช้กับรอบที่ 1 เท่านั้น

> v2: ผู้ใช้เลือก Q1 = C → รอบนี้ทำเฉพาะ frontend ของ feature ที่ backend API พร้อมแล้ว ไม่แก้ backend
> feature ที่ต้องใช้ backend ใหม่ (Publish, My Bids, keyword search/sort, อัปโหลดรูป) เลื่อนไปรอบถัดไป

## 1. วัตถุประสงค์ & เกณฑ์วัดความสำเร็จ
ทำให้ผู้ใช้ใช้งาน feature ที่ backend รองรับอยู่แล้วผ่าน UI ได้ครบ โดยไม่ต้องเรียก API เอง

วัดความสำเร็จ:
- ทุกลิงก์ใน navbar เปิดได้ ไม่มีหน้าใดได้ 404/500
- ทำ flow เหล่านี้ผ่าน UI ได้ครบ: ฝาก/ถอน/ดูประวัติเงิน · สร้าง auction (DRAFT) แล้วแก้ไข/ยกเลิก · ดู notification · ดู profile · เลือกดู auction ตาม status
- ผ่าน quality gate ใน NFR-04

## 2. ผู้ใช้ & บริบท
- **ผู้ซื้อ (Bidder)** ดูและเลือก auction, จัดการเงินใน wallet
- **ผู้ขาย (Seller)** สร้างและจัดการ auction ของตัวเอง (บัญชีเดียวเป็นได้ทั้งสองบทบาท)
- **ผู้ตรวจงาน / อาจารย์** ดู demo ผ่าน browser
- ใช้งานผ่าน browser ทั้งเดสก์ท็อปและมือถือ

## 3. ฟังก์ชันหลัก
ช่อง "API" หมายถึงสถานะ backend ปัจจุบัน: ✅ พร้อม · ⚠️ บางส่วน · ❌ ยังไม่มี

**อยู่ในขอบเขตรอบนี้**
| ID | รายการ | API | ความสำคัญ |
|----|--------|-----|-----------|
| FR-01 | หน้า Wallet: ยอดเงิน, ฝาก, ถอน, ประวัติธุรกรรมแบบแบ่งหน้า | ✅ | Must |
| FR-02 | ฟอร์มสร้าง Auction (title, description, startPrice, minIncrement, startTime, endTime) — ได้สถานะ DRAFT | ✅ | Must |
| FR-03 | My Auctions: รายการของฉันแยกตาม status, แก้ไขและยกเลิก DRAFT | ✅ | Must |
| FR-06 | Notifications: กระดิ่ง + badge ยังไม่อ่านใน navbar, หน้ารายการ, กดอ่าน, ลิงก์ไป auction | ✅ (list + mark read) | Must |
| FR-07 | หน้า Profile (ดูอย่างเดียว): ข้อมูลผู้ใช้, ยอดเงิน, วันที่สมัคร, ลิงก์ไปหน้าที่เกี่ยวข้อง | ✅ | Must |
| FR-08 | หน้า `/auctions`: filter ตาม status + แบ่งหน้า (ส่วนที่ API รองรับ) [ASSUMED — ต้องมีเพราะ navbar ลิงก์มาหน้านี้และตอนนี้ได้ 500] | ✅ | Must |
| FR-10 | หน้าที่ต้องล็อกอินจะพาไป `/login?redirect=...` และกลับมาหน้าเดิมหลังล็อกอิน | — (ฝั่ง client) | Must |
| FR-11 | Navbar มีลิงก์ครบ (เพิ่มกระดิ่ง Notifications) และทุกลิงก์ใช้งานได้ | — | Must |

**เลื่อนไปรอบถัดไป (Won't — รอบนี้)**
| ID | รายการ | เหตุผล |
|----|--------|--------|
| FR-04 | ปุ่ม Publish (DRAFT → ACTIVE) | ต้องเพิ่ม endpoint ใน backend |
| FR-05 | My Bids | ต้องเพิ่ม endpoint ใน backend |
| FR-08b | ค้นหาด้วย keyword + เรียงลำดับ | ต้องเพิ่ม parameter ใน backend |
| FR-09 | อัปโหลดรูปขึ้น cloud + แสดงรูปจริง | ต้องเพิ่ม backend + ตัดสินใจเรื่อง cloud storage (ดูข้อ 9) |

## 4. ข้อมูล
- ข้อมูลทั้งหมดมาจาก backend REST API ที่มีอยู่ (`lib/api/*`) ไม่แก้ backend
- ฝั่ง client เก็บแค่ token/user ใน localStorage ตามของเดิม ไม่เพิ่มการเก็บข้อมูลใหม่
- สกุลเงิน THB ใช้ `formatCurrency` เดิม
- ค่า filter/page ของหน้า `/auctions` เก็บใน URL query เพื่อให้ refresh หรือแชร์ลิงก์แล้วยังอยู่
- badge notification นับจาก 20 รายการล่าสุด และดึงใหม่ทุก 30 วินาที (Q3)

## 5. Non-functional
| ID | รายการ | เกณฑ์วัด |
|----|--------|----------|
| NFR-01 | Responsive | ใช้งานได้ที่ความกว้าง 375px โดยไม่มี scroll แนวนอน และที่เดสก์ท็อป ≥1280px |
| NFR-02 | สถานะหน้าจอ | ทุกหน้าที่โหลดข้อมูลมีสถานะ loading / empty / error |
| NFR-03 | ทำตาม convention เดิม | ใช้ shadcn/ui + Tailwind + lucide-react, API ผ่าน `lib/api`, auth ผ่าน zustand store เดิม |
| NFR-04 | Quality gate | `tsc --noEmit` ผ่าน · `next build` ผ่าน · `eslint` ไม่มี error ใหม่ |
| NFR-05 | Security | ไม่ใช้ `dangerouslySetInnerHTML` · validate ฟอร์มฝั่ง client ก่อนส่ง (server ยัง validate ซ้ำ) · ค่า `redirect` รับเฉพาะ path ภายในเว็บ (กัน open redirect) |
| NFR-06 | Dependency | ไม่เพิ่ม dependency ใหม่ถ้าไม่ได้อนุมัติ (component shadcn ที่ generate เป็นไฟล์ในโปรเจกต์ไม่นับ) |
| NFR-07 | ภาษา UI | อังกฤษ ตามของเดิม |

## 6. ข้อจำกัด
- **ไม่แก้ backend ในรอบนี้** (Q1 = C)
- Next.js 16.3.5 + React 19 มี breaking changes ต้องอ่านเอกสารใน `node_modules/next/dist/docs/` ก่อนเขียน (ตาม `frontend/AGENTS.md`)
- Tailwind 4, shadcn บน `@base-ui/react`
- dev local: backend อยู่ที่ `http://localhost:8081` (ตั้งผ่าน `NEXT_PUBLIC_API_URL`) ส่วน frontend ต้องรันที่พอร์ต 3000 เพราะ CORS อนุญาตแค่พอร์ตนี้
- ไม่มี deadline ที่แน่นอน (Q4) → เรียงงานตามคุณค่าและ dependency

## 7. ขอบเขตที่ไม่ทำ
- ทุกข้อในตาราง "เลื่อนไปรอบถัดไป" (FR-04, FR-05, FR-08b, FR-09)
- แก้ไข profile / เปลี่ยนรหัสผ่าน (ยังไม่มี API)
- การชำระเงินจริง, หน้า admin, แชท, แจ้งเตือนทางอีเมล
- UI ภาษาไทย, dark mode
- automated test ของ frontend (โปรเจกต์ยังไม่มี test framework) [ASSUMED]
- WebSocket แบบรายคนสำหรับ notification (ใช้ polling แทน)

## 8. เกณฑ์ว่าเสร็จ (Acceptance Criteria)
| ID | อ้างอิง | Given / When / Then |
|----|---------|---------------------|
| AC-01 | FR-01 | Given ล็อกอินแล้ว When เปิด `/wallet` Then เห็นยอดตรงกับ `GET /api/wallet/me` และประวัติ 20 รายการล่าสุด มีปุ่มไปหน้าถัดไปถ้ามีมากกว่านั้น |
| AC-02 | FR-01 | Given ยอด 100,000 When ฝาก 5,000 Then มี toast สำเร็จ, ยอดในหน้าและใน navbar เป็น 105,000 และรายการ DEPOSIT อยู่บนสุด |
| AC-03 | FR-01 | When ถอนเกินยอด Then เห็นข้อความเงินไม่พอและยอดไม่เปลี่ยน · When ใส่ 0 / ติดลบ / ว่าง Then ส่งไม่ได้และเห็น error |
| AC-04 | FR-02 | Given ล็อกอินแล้ว When กรอกฟอร์มครบแล้ว submit Then สร้างสำเร็จ แล้วพาไป My Auctions ที่มีรายการใหม่สถานะ DRAFT |
| AC-05 | FR-02 | When endTime ≤ startTime หรือราคา ≤ 0 Then เห็น error ใต้ช่องที่ผิดและยังไม่ส่งคำขอ · error จาก backend (`details`) แสดงใต้ช่องที่ตรงกัน |
| AC-06 | FR-03 | When เปิด `/auctions/my` Then มี tab All / Draft / Active / Ended / Cancelled และแต่ละรายการแสดง status, ราคาปัจจุบัน, จำนวนบิด |
| AC-07 | FR-03 | Given DRAFT ของฉัน When แก้ชื่อแล้วบันทึก Then เห็นชื่อใหม่ · When กด Cancel และยืนยัน Then เป็น CANCELLED · ปุ่ม Edit/Cancel ไม่แสดงกับ status อื่น |
| AC-10 | FR-06 | Given มี notification ยังไม่อ่าน 2 รายการ Then กระดิ่งแสดง badge 2 · When คลิกรายการ Then ถูก mark read, badge ลดลง และพาไป auction ที่เกี่ยวข้อง |
| AC-11 | FR-07 | Given ล็อกอินแล้ว When เปิด `/profile` Then เห็น username, ชื่อ, email, ยอดเงิน, วันที่สมัคร และลิงก์ไป Wallet / My Auctions |
| AC-12 | FR-08 | When เปิด `/auctions` Then ไม่ error, ค่าเริ่มต้นแสดง ACTIVE, เปลี่ยน status ได้ (ไม่มีตัวเลือก DRAFT), มีการแบ่งหน้า และค่าที่เลือกยังอยู่หลัง refresh |
| AC-15 | FR-10 | Given ยังไม่ล็อกอิน When เปิด `/wallet`, `/profile`, `/auctions/create`, `/auctions/my`, `/notifications` Then ถูกพาไป `/login?redirect=...` และหลังล็อกอินกลับมาหน้าเดิม |
| AC-16 | FR-11 | When คลิกทุกลิงก์ใน navbar Then ไม่มีหน้าใดได้ 404/500 |
| AC-17 | NFR-04 | `tsc --noEmit` ผ่าน · `next build` ผ่าน · `eslint` ไม่มี error ใหม่ |
| AC-18 | NFR-05 | When เปิด `/login?redirect=//evil.com` แล้วล็อกอิน Then ไปที่ `/` ไม่ใช่เว็บภายนอก |

(AC-08, AC-09, AC-13, AC-14 ของ v1 เลื่อนไปพร้อม FR ที่เลื่อน)

## 9. สมมติฐาน · ความเสี่ยง · คำถามค้าง

**สมมติฐาน [ASSUMED]**
- Profile W2 · โหมด Working · UI ภาษาอังกฤษ
- FR-08 (หน้า `/auctions` แบบ status filter + แบ่งหน้า) อยู่ในขอบเขต เพราะ API พร้อมและ navbar ลิงก์มาหน้านี้

**ความเสี่ยง**
- **auction ที่สร้างผ่านฟอร์มจะค้าง DRAFT และยังบิดไม่ได้** จนกว่าจะทำ FR-04 ในรอบถัดไป
- **notification เกิดเฉพาะตอน auction จบ** และ auction ตัวอย่างจบใน 3–14 วัน การทดสอบ AC-10 จึงต้องใส่ notification ทดสอบลง DB ของ dev โดยตรง (จะระบุวิธีใน design)
- API ของ Next.js 16 อาจต่างจากที่คุ้นเคย (ต้องอ่าน docs ใน node_modules ก่อน)
- JSON ของ Page (ตำแหน่ง `totalPages`) และชื่อ field `isRead` ต้องเช็คกับ API จริง

**Cloud storage (Q2 — ยังไม่มี AWS, สำหรับรอบถัดไป)**
- แนะนำ: ช่วง dev ใช้ **MinIO** ใน docker-compose (API เหมือน S3 ไม่ต้องมี account) แล้วตอน demo/deploy สลับไป **AWS S3** โดยเปลี่ยนแค่ env var
- ก่อนสมัครเอง ให้ถามอาจารย์ว่าวิชามี **AWS Academy Learner Lab** หรือไม่ (ใช้ได้โดยไม่ต้องใช้บัตร แต่ credentials เป็นแบบชั่วคราว)

**คำถามค้าง**
- ไม่มี

## 10. Delta รอบที่ 2 (v3) — frontend + backend

### 10.1 ฟังก์ชัน (ย้ายกลับเข้าขอบเขต + ใหม่)
| ID | รายการ | ความสำคัญ |
|----|--------|-----------|
| FR-04 | ผู้ขาย Publish auction ที่เป็น DRAFT ให้เป็น ACTIVE ได้ (จาก My Auctions / หน้า Edit / หน้า detail) | Must |
| FR-05 | หน้า My Bids: 1 แถวต่อ auction ที่ฉันเคยบิด + บิดสูงสุดของฉัน + ผล (Leading / Outbid / Won / Lost) | Must |
| FR-08b | หน้า `/auctions` ค้นหาด้วย keyword (ชื่อ + รายละเอียด) และเรียงลำดับ (ใหม่สุด, ใกล้จบ, ราคาต่ำ→สูง, ราคาสูง→ต่ำ, บิดมากสุด) เก็บใน URL | Must |
| FR-09 | อัปโหลดรูป (สูงสุด 5 รูป) ตอนสร้าง/แก้ไข auction ขึ้น object storage แบบ S3 และแสดงรูปจริงในการ์ด / หน้า detail / My Auctions / My Bids | Must |
| FR-12 | แจ้งเตือนผู้บิดเดิมเมื่อโดนบิดแซง ("You've been outbid") | Should |
| FR-13 | DRAFT / CANCELLED ไม่แสดงต่อสาธารณะ — เห็นได้เฉพาะเจ้าของ (แก้ช่องโหว่ข้อ 3.1) | Must |

### 10.2 เกณฑ์ว่าเสร็จ (เพิ่ม)
| ID | อ้างอิง | Given / When / Then |
|----|---------|---------------------|
| AC-08 | FR-04 | Given DRAFT ของฉันที่ endTime ยังไม่ผ่าน When กด Publish และยืนยัน Then เป็น ACTIVE, ขึ้นในหน้า `/auctions` และคนอื่นบิดได้เมื่อถึง startTime · คนอื่น publish → 403 · publish ซ้ำ/ไม่ใช่ DRAFT → 400 · endTime ผ่านแล้ว → 400 |
| AC-09 | FR-05 | Given เคยบิด 2 auction (นำ 1, โดนแซง 1) When เปิด `/bids` Then เห็น 2 แถว พร้อมบิดสูงสุดของฉัน ราคาปัจจุบัน และป้าย Leading / Outbid ถูกต้อง · auction ที่จบแล้วแสดง Won / Lost |
| AC-13 | FR-08b | When พิมพ์ "leica" Then เหลือเฉพาะ auction ที่ชื่อ/รายละเอียดมีคำนี้ (ไม่สนตัวพิมพ์) · When เลือก "Price: low to high" Then เรียงตามราคาปัจจุบัน · refresh แล้วค่ายังอยู่ · อักขระพิเศษ (`%`, `_`) ถูกค้นเป็นตัวอักษรจริง |
| AC-14 | FR-09 | When แนบรูป jpg/png/webp ≤ 5 MB (สูงสุด 5 รูป) Then รูปแสดงในการ์ดและหน้า detail · ไฟล์ผิดชนิด (ตรวจจากเนื้อไฟล์จริง) / ใหญ่เกิน / เกิน 5 รูป → error · คนอื่นอัปโหลด/ลบ → 403 · auction ที่ไม่ใช่ DRAFT → 400 |
| AC-19 | FR-13 | Given DRAFT ของ A When B (หรือผู้ไม่ได้ล็อกอิน) เปิด `GET /api/auctions/{id}` Then 404 · `GET /api/auctions` ไม่มี DRAFT/CANCELLED ปนมา · ส่ง `status=DRAFT` → 400 · A ยังเปิด DRAFT ของตัวเองได้ |
| AC-20 | FR-12 | Given alice นำอยู่ When charlie บิดแซง Then alice ได้ notification "You've been outbid" ที่ลิงก์ไป auction นั้น · บิดซ้ำของคนเดิม (ขึ้นราคาตัวเอง) ไม่สร้าง notification |
| AC-21 | NFR-04 | frontend: `tsc` / `next build` ผ่าน, eslint ไม่มี error ใหม่ · backend: build image ผ่าน (compile) และ API ใหม่ทุกตัวผ่านการทดสอบด้วย HTTP จริง |

### 10.3 ข้อจำกัด / ขอบเขตที่ไม่ทำ (รอบที่ 2)
- ยังไม่มี AWS account → dev ใช้ S3-compatible storage ในเครื่อง ออกแบบให้สลับไป AWS S3 ได้ด้วย env var เท่านั้น
- ไม่ทำ: แก้ไข profile / เปลี่ยนรหัสผ่าน, endpoint นับ unread, WebSocket รายคน, ครอปหรือย่อรูป, แก้รูปหลัง publish
- ไม่รัน backend test ชุดเดิม เพราะจะลบข้อมูลใน DB ของ dev (backlog 3.2) → ตรวจด้วย HTTP จริงแทน

## 11. Delta รอบที่ 3 (v4) — Category, Admin, Google sign-in · สถานะ: อนุมัติแล้ว (2026-09-28)

คำตอบของผู้ใช้ (2026-09-28): Category แบบระดับเดียว 1 หมวดต่อ auction · Admin ทำได้ 4 อย่าง: จัดการ Category, ดู/ระงับผู้ใช้, ยกเลิก auction ใดก็ได้, Dashboard สถิติ · admin คนแรกสร้างจาก env · Google: เชื่อมกับบัญชีเดิมที่อีเมลตรงกันอัตโนมัติ

### 11.1 ผู้ใช้ (เพิ่ม)
- **ผู้ดูแลระบบ (Admin)** ดูแลหมวดหมู่ ผู้ใช้ และเนื้อหา auction · admin เป็นผู้ใช้ปกติด้วย (บิดและขายได้) [ASSUMED]

### 11.2 ฟังก์ชัน
| ID | รายการ | ความสำคัญ |
|----|--------|-----------|
| FR-14 | Category ระดับเดียว auction ละ 1 หมวด บังคับเลือกตอนสร้าง และเปลี่ยนได้ตอนแก้ DRAFT | Must |
| FR-15 | หน้า `/auctions` กรองตามหมวด (ใช้ร่วมกับ keyword / sort / status ได้ และเก็บใน URL) · แสดงชื่อหมวดในการ์ดและหน้า detail | Must |
| FR-16 | Role `USER` / `ADMIN` ตรวจสิทธิ์ที่ backend ทุก endpoint ของ admin · `/api/users/me` ส่ง role กลับมา · เมนู Admin ใน navbar แสดงเฉพาะ admin | Must |
| FR-17 | admin คนแรกสร้างตอนเริ่มระบบจาก env `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` (ไม่มีรหัสผ่านในโค้ด) | Must |
| FR-18 | Admin จัดการ Category: เพิ่ม, แก้ชื่อ, ซ่อน/แสดง, ลบได้เฉพาะหมวดที่ไม่มี auction ใช้อยู่ | Must |
| FR-19 | Admin ดูรายชื่อผู้ใช้ (ค้นหา + แบ่งหน้า) และระงับ/ปลดระงับ · ผู้ใช้ที่ถูกระงับ login (ทั้งรหัสผ่านและ Google), บิด, สร้าง auction ไม่ได้ | Must |
| FR-20 | Admin ยกเลิก auction ใดก็ได้ที่เป็น DRAFT / ACTIVE โดยต้องใส่เหตุผล · ถ้ามีบิดแล้วคืนเงินที่ถูกกันไว้ของผู้นำ (`BID_RELEASE`) · แจ้งเตือนผู้ขายและทุกคนที่เคยบิดพร้อมเหตุผล | Must |
| FR-21 | Admin Dashboard: จำนวนผู้ใช้ (รวม / ถูกระงับ), auction แยกตาม status, จำนวนบิดทั้งหมด, ยอดขายรวมของ auction ที่จบแบบมีผู้ชนะ | Should |
| FR-22 | ปุ่ม "Continue with Google" ในหน้า login และ register · อีเมลใหม่ → สร้างบัญชีใหม่ (wallet เริ่มต้น 10,000 เท่าการสมัครปกติ) · อีเมลตรงกับบัญชีเดิมและ Google ยืนยันอีเมลแล้ว → เข้าบัญชีเดิม (ใช้ได้ทั้งรหัสผ่านและ Google) | Must |

### 11.3 ข้อมูล
- **หมวดหมู่:** ชื่อ (ไม่ซ้ำ ≤ 50 ตัวอักษร), slug สำหรับ URL, สถานะแสดง/ซ่อน · หมวดเริ่มต้น: Electronics, Cameras, Watches, Fashion, Collectibles, Art, Home & Living, Other [ASSUMED]
- **auction:** มีหมวดเสมอ · auction เดิมหลัง migrate เป็น Other ยกเว้น auction ตัวอย่างของ `bob` ที่จัดหมวดตามชนิดสินค้า เพื่อให้ demo ตัวกรองมีข้อมูลจริง [ASSUMED]
- **ผู้ใช้:** เพิ่ม role, สถานะระงับ, รหัสผู้ใช้ Google (ใช้จับคู่บัญชี) · บัญชีที่สมัครผ่าน Google ไม่มีรหัสผ่าน · username ของผู้ใช้ Google สร้างจากส่วนหน้า @ ของอีเมล (ต่อเลขถ้าซ้ำ) ชื่อเต็มมาจาก Google [ASSUMED]
- **env ใหม่:** `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (backend) · Google OAuth Client ID ทั้ง backend และ frontend (Client ID เป็นค่าสาธารณะ ไม่ใช่ secret)
- ข้อมูลเดิมใน DB dev (ผู้ใช้, auction, บิด, wallet, รูป) ต้องอยู่ครบหลังเปลี่ยน schema

### 11.4 Non-functional
| ID | รายการ | เกณฑ์วัด |
|----|--------|----------|
| NFR-08 | สิทธิ์ admin ตรวจที่ backend | ทุก endpoint ของ admin: ไม่ได้ login → 401 · USER → 403 · ADMIN → สำเร็จ (การซ่อนเมนูใน UI ไม่นับเป็นการป้องกัน) |
| NFR-09 | การระงับมีผลทันที | token เดิมของผู้ถูกระงับใช้ไม่ได้ตั้งแต่ request ถัดไป ไม่ต้องรอ token หมดอายุ |
| NFR-10 | ตรวจ Google token ที่ server | ตรวจลายเซ็น, issuer, audience (= Client ID ของเรา), เวลาหมดอายุ และ `email_verified` · ไม่เชื่อข้อมูลผู้ใช้ที่ browser ส่งมาเอง |
| NFR-11 | Migration ไม่ทำข้อมูลหาย | จำนวนแถวของ users / auction_items / bids / wallet_transactions / item_images ก่อนและหลัง migrate เท่ากัน |
| NFR-12 | Secret | รหัส admin อยู่ใน env เท่านั้น · ไม่มี Google client secret ใน frontend |

### 11.5 เกณฑ์ว่าเสร็จ (เพิ่ม)
| ID | อ้างอิง | Given / When / Then |
|----|---------|---------------------|
| AC-22 | FR-14 | When สร้าง auction โดยไม่เลือกหมวด หรือเลือกหมวดที่ซ่อนอยู่ / ไม่มีจริง Then ได้ 400 และเห็น error ใต้ช่อง · เลือก Cameras Then การ์ดและหน้า detail แสดง "Cameras" · แก้ DRAFT เปลี่ยนหมวดได้ |
| AC-23 | FR-15 | When เลือกหมวด Cameras ที่ `/auctions` Then เหลือเฉพาะ Cameras และใช้ร่วมกับ keyword/sort ได้ · refresh แล้วค่ายังอยู่ · หมวดที่ไม่มีจริงใน URL → 400 · ตัวกรองไม่แสดงหมวดที่ซ่อน |
| AC-24 | FR-16, NFR-08 | เรียก endpoint admin ทุกตัว: ไม่ได้ login → 401 · alice (USER) → 403 · admin → สำเร็จ · alice เปิด `/admin` → เห็นข้อความไม่มีสิทธิ์และไม่เห็นเมนู Admin ใน navbar |
| AC-25 | FR-17 | ตั้ง env ครบแล้วเริ่มระบบ → login เป็น admin ได้ · restart แล้วไม่สร้างซ้ำ · ไม่ตั้ง env → ระบบเริ่มได้ปกติ (มี log เตือน) และไม่มี admin · username ใน env มีอยู่แล้ว → ปรับเป็น admin โดยไม่เปลี่ยนรหัสผ่านเดิม |
| AC-26 | FR-18 | admin เพิ่ม "Books" → เห็นในฟอร์มสร้างและตัวกรอง · แก้ชื่อ → ชื่อใหม่แสดงทุกที่ · ซ่อน → เลือกไม่ได้และไม่อยู่ในตัวกรอง แต่ auction เดิมยังแสดงชื่อหมวด · ลบหมวดที่มี auction → 409 · ชื่อซ้ำ → 409 · ลบ/ซ่อน Other ไม่ได้ |
| AC-27 | FR-19, NFR-09 | admin ระงับ charlie → request ถัดไปด้วย token เดิมของ charlie ได้ 401 · login ด้วยรหัสผ่านหรือ Google ได้ข้อความ "Account suspended" · ปลดระงับแล้ว login ได้ · ระงับตัวเองหรือ admin คนอื่น → 400 |
| AC-28 | FR-20 | Given auction ACTIVE ที่ alice นำอยู่ 1,500 When admin ยกเลิกพร้อมเหตุผล Then status เป็น CANCELLED, ยอดของ alice เพิ่ม 1,500 (รายการ `BID_RELEASE`), ผู้ขายและผู้เคยบิดทุกคนได้ notification ที่มีเหตุผล, auction หายจากหน้าสาธารณะ และบิดต่อไม่ได้ · ยกเลิก ENDED / CANCELLED → 400 · ไม่ใส่เหตุผล → 400 |
| AC-29 | FR-21 | ตัวเลขทุกช่องใน Dashboard ตรงกับการนับด้วย SQL บน DB เดียวกัน |
| AC-30 | FR-22, NFR-10 | บัญชี Google ใหม่ → สร้างบัญชี ยอด 10,000 และ login สำเร็จ · login ด้วย Google ซ้ำ → บัญชีเดิม · อีเมลตรงบัญชีเดิม → เข้าบัญชีเดิม · token ปลอม / หมดอายุ / audience ผิด / อีเมลไม่ verified → 401 · ไม่ได้ตั้ง Client ID → ไม่แสดงปุ่ม Google · login ด้วยรหัสผ่านกับบัญชีที่สมัครผ่าน Google → "Invalid username or password" |
| AC-31 | NFR-11 | จำนวนแถวของตารางเดิมก่อน/หลัง migrate เท่ากัน และ backend เริ่มได้ (`ddl-auto: validate` ผ่าน) |
| AC-32 | NFR-04 | frontend: `tsc` / `next build` ผ่าน, eslint ไม่มี error ใหม่ · backend: build image ผ่าน และ API ใหม่ทุกตัวผ่านการทดสอบด้วย HTTP จริง |

### 11.6 ข้อจำกัด
- **Google Client ID ต้องสร้างเอง** ใน Google Cloud Console (ฟรี) แบบ Web application ตั้ง Authorized JavaScript origin เป็น `http://localhost:3000` · ระหว่างรอ ผมทำส่วนอื่นได้ครบ
- **ผมทดสอบ login ผ่าน Google จริงเองไม่ได้** เพราะต้องใช้บัญชี Google ใน browser → ผมทดสอบกรณีที่ต้องปฏิเสธด้วย HTTP จริง ส่วนกรณีสำเร็จ (AC-30 ข้อ 1–3) คุณทดสอบใน browser
- ต้อง migrate schema ของ DB dev ที่มีข้อมูลอยู่ (ตอนนี้ไม่มีเครื่องมือ migration) → เลือกวิธีในเฟส Design และขออนุญาตก่อนรัน พร้อม backup
- ข้อจำกัดจากรอบก่อนยังใช้อยู่: ไม่รัน backend test ชุดเดิม, UI ภาษาอังกฤษ, ใช้ shadcn/ui ตามเดิม

### 11.7 ขอบเขตที่ไม่ทำ (รอบที่ 3)
- หมวดย่อย, หลายหมวดต่อ auction, ไอคอน/รูปของหมวด
- ตั้ง/รีเซ็ตรหัสผ่าน (รวมถึงให้ผู้ใช้ Google ตั้งรหัสผ่าน), ยกเลิกการเชื่อม Google, provider อื่น (Facebook, GitHub ฯลฯ), ยืนยันอีเมลตอนสมัครด้วยรหัสผ่าน
- เลื่อนหรือถอดสิทธิ์ admin ผ่าน UI (ใช้ env ตามที่เลือก), ลบผู้ใช้, ปรับยอด wallet ด้วยมือ, แก้เนื้อหา auction ของคนอื่น, ยกเลิก auction ที่ ENDED แล้ว, หน้า audit log
- การระงับไม่ยกเลิก auction หรือบิดที่ผู้ใช้นั้นมีอยู่อัตโนมัติ (admin ยกเลิก auction เองได้ตาม FR-20) [ASSUMED]

### 11.8 สมมติฐาน · ความเสี่ยง · คำถามค้าง
**สมมติฐาน [ASSUMED]** — ระบุไว้ในข้อที่เกี่ยวข้องด้านบน และเพิ่ม:
- หน้า admin อยู่ใต้ `/admin` (Dashboard, Users, Auctions, Categories) · รายการ auction ในหน้า admin เห็นทุก status รวม DRAFT/CANCELLED ของทุกคน
- `alice`, `bob`, `charlie` ยังเป็น USER · Other เป็นหมวดตั้งต้นที่ลบหรือซ่อนไม่ได้

**ความเสี่ยง**
- **[Security · กลาง] เชื่อมบัญชีอัตโนมัติ (FR-22)** — การสมัครด้วยรหัสผ่านไม่ได้ยืนยันอีเมล คนอื่นจึงสมัครด้วยอีเมลของเหยื่อไว้ก่อนได้ พอเหยื่อ login ด้วย Google ครั้งแรกก็จะเข้าบัญชีที่คนนั้นรู้รหัสผ่านอยู่แล้ว · ทางแก้: (a) ยอมรับความเสี่ยงและบันทึกไว้ เหมาะกับงาน demo · (b) พอเชื่อม Google ครั้งแรก ให้ปิดการ login ด้วยรหัสผ่านของบัญชีนั้น แล้วใช้ Google อย่างเดียว · **ผู้ใช้เลือก (a)** — บันทึกเป็นข้อจำกัดที่ทราบใน README
- admin ยกเลิก auction ในจังหวะเดียวกับที่มีคนบิดหรือระบบกำลังปิด auction → ต้องใช้ lock เดียวกับการบิด (ออกแบบในเฟส Design)
- ขอบเขตใหญ่กว่ารอบที่ 2 (ประเมินราว 18–22 Unit) และแตะ auth ซึ่งเสี่ยงสูง → แนะนำให้ commit งานรอบ 1–2 เป็นจุดย้อนกลับก่อนเริ่ม Build
- GATE 3 ของรอบ 1–2 ยังไม่ได้ทดสอบใน browser → ถ้ามีบั๊กจากรอบก่อน อาจปนกับของรอบนี้

**คำถามค้าง**
- ไม่มี (เรื่องเชื่อมบัญชี ผู้ใช้เลือก (a))
