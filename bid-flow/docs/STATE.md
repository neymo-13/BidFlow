# STATE — BidFlow

- Skill: AI-DLC + Loop Engineering (`ai_dlc_loop_skill.md`) ตั้งแต่ 2026-09-28 (D-010)
- Profile: W2 (Next.js 16 frontend) + B1 (Spring Boot backend) ตั้งแต่รอบที่ 2 · Autonomy: Standard (D-011) · โหมด: Working [ASSUMED] · Preset: ไม่ใช้
- สถานะ: Brownfield (มีโค้ดอยู่แล้ว — Auth, Auction, Bidding real-time, Wallet API, Settlement, Notification API)
- เฟสปัจจุบัน: Build (รอบที่ 3 — Category, Admin, Google sign-in) · Unit: 0/23 · สถานะ: กำลังทำ R3-B1 · Build รอบที่ 2 ครบ 16/16 แต่ GATE 3 ของรอบ 1–2 ยังไม่ได้ทดสอบใน browser
- Gate ที่ผ่านแล้ว: GATE 1 — requirement v2 (2026-09-27) · GATE 2 — design v1 (2026-09-27) · requirement v3 (Change Control, 2026-09-27) · GATE 2 — design v2 (2026-09-28) · GATE 1 — requirement v4 (2026-09-28, เชื่อมบัญชีแบบ (a)) · GATE 2 — design v3 (2026-09-29, Autonomy Standard)
- รอบที่ 1 (เสร็จ, ยังไม่ผ่าน GATE 3): frontend ของ Wallet, Create Auction, My Auctions, Notifications, Profile, `/auctions` — U0–U8
- รอบที่ 2 (Build เสร็จ): ซ่อน DRAFT, ค้นหา/เรียง, Publish, My Bids, แจ้งเตือนโดนแซง, อัปโหลดรูปขึ้น object storage (s3mock ตอน dev / AWS S3 ด้วย env) — backend R2-B1…B9 + frontend R2-F1…F6 + R2-V (docs/traceability.md)
- คำถามค้าง: `localhost:8081` (→ `::1`) ค้างเพราะ `wslrelay` ของ docker-desktop ค้าง (`127.0.0.1:8081` ปกติ) — ผู้ใช้ให้ restart Docker Desktop ตอนท้ายสุด (ตอนนี้) → หลัง restart ให้ AI ตรวจ `localhost` + ทดลอง bind `127.0.0.1` ใน `docker-compose.local.yml` กันเกิดซ้ำ
- รอบที่ 3: requirement v4 + design v3 อนุมัติแล้ว (design.md หัวข้อ 12, 23 Units) · ผู้ใช้ต้องสร้าง Google OAuth Client ID เอง (ใช้ตอน R3-F8)
- Git: งานรอบ 1–2 commit แล้วบน branch `feat/ai-dlc-build` (ยังไม่ push, ไม่แตะ `main`) · ไฟล์ skill 3 ไฟล์ที่ root ไม่ได้ commit
- ขั้นตอนถัดไป: R3-B1 — เตรียมไฟล์ + backup + นับแถว แล้วหยุดยืนยันก่อน migrate DB dev · restart Docker + GATE 3 ของรอบ 1–2 ยังค้าง
- วิธีรัน: backend `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build` · frontend `cd frontend && npm run dev` (รันอยู่เบื้องหลังตอนนี้)
- สภาพแวดล้อม local: backend 8081, Postgres 5433, Redis 6379, s3mock 9090, frontend 3000 · เครื่องมี Jenkins (8080), PostgreSQL service (5432), Java 17 ใน PATH · container `open-webui` ถูกหยุดเพื่อใช้พอร์ต 3000
- ข้อมูลทดสอบใน DB dev: user `qa_bot`, `qa_bidder_a`, `qa_bidder_b` (รหัส password123) · auction `[TEST]` id 6, 9–26 เป็น CANCELLED ทั้งหมด · รูปทดสอบใน bucket ใต้ `auctions/17..26/` (D-014–D-022)
- ยังไม่ commit — รอผู้ใช้สั่ง
- Backlog (นอกขอบเขต ยังไม่แก้): eslint error เดิม 4 จุด (`app/page.tsx`, `lib/hooks/use-auction-websocket.ts`, `lib/store/auth-store.ts` ×2) · ข้อความ error เรื่องเงินไม่พอมี user id ภายใน · backend ไม่จำกัดยอดฝากสูงสุด · endpoint บิดตอบต่างกันระหว่าง "ไม่มีจริง" กับ DRAFT (เดาได้ว่ามี id อยู่ ความเสี่ยงต่ำ) · HEALTHCHECK ของ `backend/Dockerfile` ยิง `/actuator/health` ที่ไม่มี → unhealthy · ข้อความเวลานับถอยหลังไม่อัปเดตเอง · seller โหลดแบบ lazy (1 query ต่อผู้ขาย) ในหน้า list
