# BidFlow — คู่มือติดตั้ง ใช้งาน และทดสอบ

BidFlow เป็นเว็บประมูลสินค้าแบบ real-time ผู้ใช้ลงขายสินค้า ประมูลแข่งกันแล้วเห็นราคาอัปเดตทันที และใช้ wallet จำลองในการถือเงินบิดและจ่ายเงิน ผู้ดูแลระบบ (admin) จัดการหมวดสินค้า ผู้ใช้ และ auction ได้

เอกสารนี้อธิบายวิธีติดตั้ง วิธีใช้งาน และวิธีทดสอบทั้งระบบ รายละเอียดเชิงลึกสำหรับนักพัฒนาอยู่ใน [เอกสารอื่น](#9-เอกสารอื่น)

---

## สารบัญ
1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สิ่งที่ต้องติดตั้งก่อน](#2-สิ่งที่ต้องติดตั้งก่อน)
3. [ติดตั้งและรัน](#3-ติดตั้งและรัน)
4. [ตั้งค่าเพิ่มเติม: Admin และ Google sign-in](#4-ตั้งค่าเพิ่มเติม-admin-และ-google-sign-in)
5. [วิธีใช้งาน](#5-วิธีใช้งาน)
6. [วิธีทดสอบ](#6-วิธีทดสอบ)
7. [แก้ปัญหาที่พบบ่อย](#7-แก้ปัญหาที่พบบ่อย)
8. [ข้อจำกัดที่ทราบ](#8-ข้อจำกัดที่ทราบ)
9. [เอกสารอื่น](#9-เอกสารอื่น)

---

## 1. ภาพรวมระบบ

**ฟีเจอร์หลัก**
- สมัครสมาชิก / login ด้วยรหัสผ่าน หรือ "Continue with Google"
- ลงขายสินค้า: เลือกหมวด ใส่รูปได้สูงสุด 5 รูป บันทึกเป็น Draft แล้วกด Publish
- เลือกดู ค้นหา กรองตามหมวด และเรียงลำดับ auction
- บิดแบบ real-time (WebSocket) พร้อมแจ้งเตือนเมื่อโดนบิดแซง ชนะ หรือขายได้
- Wallet จำลอง: ฝาก ถอน ถือเงินตอนบิด คืนเงินเมื่อโดนแซง และจ่ายผู้ขายเมื่อปิดการประมูล
- My Auctions (ฝั่งผู้ขาย), My Bids (ฝั่งผู้ซื้อ), Notifications, Profile
- หน้า Admin: Dashboard สถิติ, จัดการหมวด, ระงับ/ปลดระงับผู้ใช้, ยกเลิก auction พร้อมคืนเงิน

**สถาปัตยกรรม**

```text
Browser ──► Frontend (Next.js 16)  http://localhost:3000
              │  REST + JWT, WebSocket (STOMP/SockJS)
              ▼
            Backend (Spring Boot 4, Java 21)  http://localhost:8080
              ├── PostgreSQL 16   ข้อมูลหลัก (schema เริ่มต้น + Flyway migration)
              ├── Redis 7         distributed lock ตอนบิด
              └── S3 storage      รูปสินค้า (ตอน dev ใช้ s3mock, production ใช้ AWS S3)
```

Backend, PostgreSQL, Redis และ s3mock รันด้วย Docker Compose ส่วน frontend รันด้วย `npm run dev`

---

## 2. สิ่งที่ต้องติดตั้งก่อน

| โปรแกรม | เวอร์ชัน | ใช้ทำอะไร |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | ล่าสุด | รัน backend, ฐานข้อมูล, Redis, storage |
| [Node.js](https://nodejs.org/) | 20.9 ขึ้นไป (ทดสอบกับ 22) | รัน frontend |
| Git | — | clone โปรเจกต์ |

ไม่ต้องติดตั้ง Java หรือ Maven เพราะ backend ถูก build ใน Docker

---

## 3. ติดตั้งและรัน

### 3.1 Clone โปรเจกต์
```bash
git clone <repo-url>
cd BidFlow/bid-flow
```

### 3.2 ตั้งค่า `.env` ที่ root
ไฟล์ `.env` ใช้เปิด Google sign-in และสร้าง admin คนแรก (ดู[หัวข้อ 4](#4-ตั้งค่าเพิ่มเติม-admin-และ-google-sign-in))

```bash
cp .env.example .env
```

- `GOOGLE_CLIENT_ID` ใส่ Client ID ของทีมไว้ให้แล้ว คัดลอกมาก็ใช้ได้เลย
- `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` ว่างไว้ ให้แต่ละคนตั้ง admin ของตัวเองใน `.env` ถ้าว่างไว้ระบบก็ยังรันได้ แค่จะไม่มี admin

> ⚠️ ค่าจริงต้องใส่ใน **`.env`** เท่านั้น ห้ามใส่ใน `.env.example`
> - Docker Compose อ่านแค่ `.env` ค่าที่อยู่ใน `.env.example` จึงไม่มีผล
> - `.env.example` เป็นไฟล์ตัวอย่างที่ถูก commit ขึ้น git ทุกคนจะเห็นรหัสผ่าน
> - `.env` อยู่ใน `.gitignore` จึงไม่ถูก commit

### 3.3 รัน backend (Docker)
เปิด Docker Desktop ให้ขึ้นก่อน แล้วรันที่โฟลเดอร์ `bid-flow`:

```bash
docker compose up -d --build
```

| Service | Container | พอร์ตบนเครื่อง |
|---|---|---|
| Backend | `auction-backend` | 8080 |
| PostgreSQL | `auction-postgres` | 5432 |
| Redis | `auction-redis` | 6379 |
| Object storage (s3mock) | `auction-object-storage` | 9090 |

ครั้งแรกจะใช้เวลา build สักพัก ระบบพร้อมเมื่อเปิด <http://localhost:8080/api/categories> แล้วเห็นรายการหมวดเป็น JSON

ตอนเริ่มครั้งแรกกับฐานข้อมูลว่าง backend จะสร้างข้อมูลตัวอย่างให้:
- ผู้ใช้ `alice`, `bob`, `charlie` รหัสผ่าน `password123` ยอดเงินเริ่มต้นคนละ ฿100,000
- auction ตัวอย่าง 5 รายการของ `bob`
- หมวดสินค้า 8 หมวด

#### ถ้าพอร์ต 8080 หรือ 5432 ถูกโปรแกรมอื่นใช้อยู่
พอร์ตนี้มักชนกับ Jenkins หรือ PostgreSQL ที่ติดตั้งในเครื่อง ให้สร้างไฟล์ `docker-compose.local.yml` (อยู่ใน `.gitignore` แล้ว) เพื่อย้ายพอร์ต:

```yaml
services:
  postgres-db:
    ports: !override
      - "5433:5432"
  backend:
    ports: !override
      - "8081:8080"
```

จากนั้นรันด้วยไฟล์นี้ทุกครั้ง:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

และให้ frontend เรียก backend ที่พอร์ต 8081 (ดูขั้นถัดไป)

### 3.4 รัน frontend
เปิดเทอร์มินัลใหม่:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

ในไฟล์ `frontend/.env.local`:
- `NEXT_PUBLIC_API_URL` ตั้งให้ตรงกับพอร์ตของ backend
  - พอร์ตปกติ: `http://localhost:8080`
  - ถ้าใช้ไฟล์ override: `http://localhost:8081`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ใส่ Client ID ของทีมไว้ให้แล้ว (ค่าเดียวกับ `GOOGLE_CLIENT_ID` ใน `.env` ที่ root)

เปิดเว็บที่ **<http://localhost:3000>**

> ต้องใช้พอร์ต **3000** เท่านั้น เพราะ backend อนุญาต CORS เฉพาะ `localhost:3000` และ `127.0.0.1:3000` ถ้า Next.js ขยับไปใช้ 3001 เพราะ 3000 ไม่ว่าง หน้าเว็บจะเรียก API ไม่ได้ ให้ปิดโปรแกรมที่ใช้พอร์ต 3000 ก่อน

### 3.5 หยุด รันใหม่ และล้างข้อมูล

| ต้องการ | คำสั่ง (ใส่ `-f docker-compose.yml -f docker-compose.local.yml` ถ้าใช้ไฟล์ override) |
|---|---|
| หยุด backend | `docker compose stop` |
| รันใหม่ (ข้อมูลยังอยู่) | `docker compose up -d` |
| build backend ใหม่หลังแก้โค้ด | `docker compose up -d --build backend` |
| ดู log ของ backend | `docker logs -f auction-backend` |
| **ล้างข้อมูลทั้งหมด** (ฐานข้อมูล, Redis, รูป) | `docker compose down -v` ⚠️ ย้อนกลับไม่ได้ |

หยุด frontend ด้วย `Ctrl + C` ในเทอร์มินัลที่รัน `npm run dev`

หลังรีสตาร์ตเครื่อง ให้เปิด Docker Desktop แล้วรัน `docker compose up -d` (ไม่ต้อง `--build`) และ `npm run dev` ใหม่

---

## 4. ตั้งค่าเพิ่มเติม: Admin และ Google sign-in

### 4.1 สร้าง admin คนแรก
ระบบไม่มีหน้าสมัคร admin backend จะสร้าง admin จากค่าใน `.env` ตอนเริ่มระบบ

1. ใส่ค่าใน `.env` ที่ root:
   ```env
   ADMIN_USERNAME=<username>
   ADMIN_EMAIL=<email>
   ADMIN_PASSWORD=<รหัสผ่านอย่างน้อย 8 ตัว>
   ```
2. รีสตาร์ต backend ด้วย `docker compose up -d backend`
3. log ของ backend ต้องมีบรรทัดจาก `AdminBootstrap` ว่าสร้างหรือปรับสิทธิ์สำเร็จ ดูได้ด้วย `docker logs auction-backend | grep AdminBootstrap`
4. login ด้วย username นั้น เมนูบัญชีมุมขวาบนจะมี **Admin**

กติกา:
- ถ้า username นั้นมีอยู่แล้ว บัญชีนั้นจะกลายเป็น admin โดยรหัสผ่านเดิมไม่เปลี่ยน
- ถ้ารีสตาร์ตซ้ำ ระบบไม่สร้าง admin ซ้ำ
- ถ้าลบค่าออกจาก `.env` admin เดิมยังเป็น admin อยู่ ต้องถอดสิทธิ์ด้วย SQL:
  ```bash
  docker exec auction-postgres psql -U postgres -d auction_db -c "update users set role='USER' where username='<username>';"
  ```

### 4.2 เปิด Google sign-in
**ใช้ Client ID ของทีม (ค่าเริ่มต้น):** ถ้าคัดลอก `.env.example` เป็น `.env` และ `frontend/.env.example` เป็น `frontend/.env.local` ตามหัวข้อ 3 แล้ว Google sign-in จะเปิดอยู่แล้ว เปิดเว็บผ่าน `http://localhost:3000` จะเห็นปุ่ม "Continue with Google" ในหน้า login และ register

> ถ้า OAuth consent screen ของทีมยังอยู่ในสถานะ **Testing** จะ login ได้เฉพาะบัญชี Google ที่ถูกเพิ่มไว้ใน **Test users** บัญชีอื่นจะเห็นหน้า "Access blocked" ให้เจ้าของโปรเจกต์ Google Cloud เพิ่ม Gmail ของสมาชิกที่ **APIs & Services → OAuth consent screen → Test users** (หรือกด Publish app)

**ใช้ Client ID ของตัวเอง:**
1. ไปที่ Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID** แล้วเลือกชนิด **Web application**
2. ที่ **Authorized JavaScript origins** ใส่ `http://localhost:3000` และ `http://localhost` (ไม่ต้องใส่ redirect URI เพราะปุ่มใช้ popup)
3. นำ Client ID ไปใส่ **ทั้ง 2 ที่** ด้วยค่าเดียวกัน (Client ID ไม่ใช่ความลับ):
   - `.env` ที่ root: `GOOGLE_CLIENT_ID=...` แล้วรัน `docker compose up -d backend`
   - `frontend/.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...` แล้วหยุดและรัน `npm run dev` ใหม่
4. เปิดเว็บผ่าน `http://localhost:3000` (ห้ามใช้ `127.0.0.1` เพราะไม่ได้ลงทะเบียนไว้กับ Google)

**ปิด Google sign-in:** ทำให้ค่าทั้งสองว่าง แล้วรีสตาร์ต backend และ `npm run dev` ปุ่มจะหายไป

ถ้าตั้งไม่ครบจะไม่มีปุ่ม Google หรือกดแล้วได้ error ดู[หัวข้อ 7](#7-แก้ปัญหาที่พบบ่อย)

---

## 5. วิธีใช้งาน

บัญชีตัวอย่าง: `alice`, `bob`, `charlie` รหัสผ่าน `password123` เริ่มที่ ฿100,000 ส่วนบัญชีที่สมัครใหม่หรือสร้างผ่าน Google เริ่มที่ ฿10,000

### ผู้ซื้อ
1. **เลือกดูสินค้า** ที่เมนู Auctions:
   - tab Live / Ended
   - ค้นหาจากชื่อหรือรายละเอียด
   - กรองตามหมวด และเรียงตามราคา เวลาใกล้จบ หรือจำนวนบิด
2. **บิด** เข้าหน้าสินค้าแล้วใส่ราคา (อย่างน้อยราคาปัจจุบันบวกขั้นต่ำ) เงินเท่ากับยอดบิดจะถูกถือไว้จาก Wallet ถ้าโดนบิดแซง เงินจะคืนอัตโนมัติ
3. **ติดตามผล** ที่ My Bids มีป้าย Leading / Outbid / Won / Lost ส่วนกระดิ่งแจ้งเตือนอัปเดตทุก 30 วินาที
4. **Wallet** ฝาก ถอน และดูประวัติธุรกรรม

### ผู้ขาย
1. **Sell an item** กรอกชื่อ เลือกหมวด (บังคับ) ใส่ราคาเริ่มต้น ขั้นต่ำการบิด เวลาเริ่มและเวลาจบ ใส่รูปได้สูงสุด 5 รูป (JPEG/PNG/WebP ไม่เกิน 5 MB ต่อรูป) จากนั้นบันทึกเป็น **Draft**
2. **My Auctions** แก้ไขหรือยกเลิก Draft ได้ แล้วกด **Publish** เพื่อเปิดประมูล หลัง publish จะแก้ไขไม่ได้แล้ว
3. เมื่อถึงเวลาจบ ระบบปิดการประมูลอัตโนมัติภายในประมาณ 30 วินาที ผู้ชนะจ่ายเงินจากยอดที่ถือไว้ ผู้ขายได้เงินเข้า Wallet และทั้งสองฝ่ายได้แจ้งเตือน

### Admin (เมนูบัญชี → Admin)
| หน้า | ทำอะไรได้ |
|---|---|
| Dashboard | จำนวนผู้ใช้ (ทั้งหมด / ถูกระงับ / admin), auction แยกตามสถานะ, จำนวนบิด, ยอดขายรวม |
| Users | ค้นหาผู้ใช้ ระงับหรือปลดระงับ (ผู้ถูกระงับจะถูกออกจากระบบทันทีและ login ไม่ได้) แต่ระงับ admin ไม่ได้ |
| Auctions | ดู auction ทุกสถานะของทุกคน ยกเลิก Draft หรือ Live พร้อมเหตุผล ผู้นำการบิดได้เงินคืน และผู้ขายกับผู้บิดทุกคนได้แจ้งเตือน |
| Categories | เพิ่ม เปลี่ยนชื่อ ซ่อน/แสดง หรือลบหมวดที่ไม่มี auction ใช้ ส่วนหมวด Other ซ่อนหรือลบไม่ได้ |

---

## 6. วิธีทดสอบ

### 6.1 ทดสอบอัตโนมัติ

**Frontend** (ในโฟลเดอร์ `frontend`)
```bash
npx tsc --noEmit   # ตรวจ type
npm run lint       # ESLint (มี error เดิม 4 จุดที่ทราบอยู่แล้ว ห้ามมีจุดใหม่)
npm run build      # production build ต้องผ่าน
```

**Backend: unit test** ไม่แตะฐานข้อมูลและไม่ต้องรัน Spring จึงรันได้ทุกเมื่อ
- `GoogleTokenVerifierTest` ตรวจ Google token ปลอม หมดอายุ audience ผิด และ alg confusion
- `GoogleAuthServiceTest` ตรวจการจับคู่บัญชี Google

ถ้าไม่มี JDK/Maven ในเครื่อง ให้รันผ่าน Docker ในโฟลเดอร์ `backend`:
```bash
docker run --rm -v "$PWD:/app" -v bidflow-m2:/root/.m2 -w /app maven:3.9-eclipse-temurin-21 \
  mvn -q test -Dtest='GoogleTokenVerifierTest,GoogleAuthServiceTest' -Dsurefire.failIfNoSpecifiedTests=false
```
ถ้ามี JDK 21 และ Maven ใช้ `mvn test -Dtest='GoogleTokenVerifierTest,GoogleAuthServiceTest' -Dsurefire.failIfNoSpecifiedTests=false` ได้เลย

> ⚠️ **ห้ามรัน `mvn test` ทั้งชุด** เพราะ test รุ่นเก่า (`ConcurrentBiddingTest`, `SettlementTest`) จะล้างข้อมูลในฐานข้อมูลที่ตั้งค่าไว้ และตอนนี้ยัง fail เพราะสร้าง auction โดยไม่ใส่หมวด

### 6.2 ทดสอบ API ด้วย curl
```bash
API=http://localhost:8080   # หรือ 8081 ถ้าใช้ไฟล์ override

# login แล้วเก็บ token
TOKEN=$(curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

curl -s $API/api/users/me -H "Authorization: Bearer $TOKEN"           # ข้อมูลตัวเอง (มี role)
curl -s "$API/api/auctions?status=ACTIVE&category=cameras&sort=priceAsc"  # list แบบกรอง
curl -s -o /dev/null -w "%{http_code}\n" $API/api/admin/stats -H "Authorization: Bearer $TOKEN"  # alice ไม่ใช่ admin → 403
```
รายการ endpoint ทั้งหมดพร้อม request, response และ error อยู่ใน [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### 6.3 ทดสอบด้วยมือใน browser (checklist)
**เตรียม:**
- เปิด 2 หน้าต่าง (ปกติ + Incognito) เพื่อ login เป็นคนละคนพร้อมกัน
- รูปทดสอบ: รูปปกติ 2–3 รูป, ไฟล์ `.txt` ที่เปลี่ยนนามสกุลเป็น `.jpg` และรูปที่ใหญ่เกิน 5 MB
- ถ้าจะทดสอบหัวข้อ H ต้องตั้ง admin ตาม[หัวข้อ 4.1](#41-สร้าง-admin-คนแรก)
- รหัสในวงเล็บคือเกณฑ์ผ่าน (AC) ใน `docs/requirements.md`

**A. Login และการกันหน้า** (AC-15, 16, 18)
- [ ] ยังไม่ login แล้วเปิด `/wallet` → ถูกพาไป `/login?redirect=...` พอ login แล้วต้องกลับมาที่ `/wallet`
- [ ] เปิด `/login?redirect=//evil.com` แล้ว login → ต้องไปหน้า `/` ไม่ออกไปเว็บข้างนอก
- [ ] กดทุกลิงก์ใน navbar และเมนูบัญชี → ไม่มีหน้าไหนขึ้น 404 หรือ error

**B. Wallet** (AC-01–03)
- [ ] ยอดในหน้า `/wallet` ตรงกับตัวเลขใน navbar
- [ ] ฝาก 5,000 → ขึ้น toast สำเร็จ ยอดเพิ่มทั้งในหน้าและ navbar และรายการ DEPOSIT อยู่บนสุด
- [ ] ถอนเกินยอด → ขึ้นข้อความเงินไม่พอ และยอดไม่เปลี่ยน
- [ ] ใส่ 0, ค่าติดลบ หรือเว้นว่าง → ส่งไม่ได้และมี error

**C. สร้างและแก้ auction** (AC-04, 05, 07, 14, 22) ใช้บัญชี `bob`
- [ ] กดสร้างโดยไม่กรอกอะไร → มี error ใต้ทุกช่อง รวมถึง "Category is required"
- [ ] ตั้งเวลาจบก่อนเวลาเริ่ม หรือใส่ราคา 0 → มี error ใต้ช่องนั้น
- [ ] กรอกครบ เลือกหมวด Cameras ใส่รูป 2 รูป → ไปหน้า My Auctions และเห็นรายการใหม่เป็น DRAFT
- [ ] รูปปลอม รูปที่เกิน 5 MB หรือรูปที่ 6 → ถูกปฏิเสธ
- [ ] แก้ชื่อและหมวดของ draft → การ์ดแสดงค่าใหม่
- [ ] ยกเลิก draft → เป็น CANCELLED และรายการที่ไม่ใช่ DRAFT ต้องไม่มีปุ่ม Edit/Cancel

**D. Publish และการมองเห็น** (AC-06, 08, 19)
- [ ] My Auctions มี tab All / Draft / Active / Ended / Cancelled
- [ ] กด Publish → เป็น ACTIVE และขึ้นในหน้า `/auctions` ถ้าเวลาเริ่มยังมาไม่ถึง จะขึ้นว่า "Starts in …"
- [ ] `alice` มองไม่เห็น draft ของ `bob` และถ้าเปิด URL ของ draft นั้นตรงๆ ต้องขึ้นว่าไม่พบ

**E. เลือกดู ค้นหา กรองหมวด** (AC-12, 13, 23)
- [ ] `/auctions` เปิดมาที่ tab Live, สลับไป Ended ได้, ไม่มีตัวเลือก Draft และแบ่งหน้าได้
- [ ] ค้นหา `LEICA` → เจอแม้ตัวพิมพ์ต่างกัน
- [ ] ค้นหา `%` → ต้องไม่ได้ทุกรายการ
- [ ] เรียงราคาจากน้อยไปมาก → ผลเรียงถูก และ refresh แล้วค่าที่เลือกยังอยู่
- [ ] เลือกหมวด Cameras → เหลือเฉพาะ Cameras ใช้ร่วมกับการค้นหาและการเรียงได้
- [ ] ใส่ `?category=xyz` ใน URL → แสดงทุกหมวดโดยไม่มี error
- [ ] หน้า detail กด badge หมวด → ไปหน้า list ที่กรองหมวดนั้น

**F. บิดแบบ real-time และแจ้งเตือน** (AC-09, 10, 20) หน้าต่าง A เป็น `alice` หน้าต่าง B เป็น `charlie` ทั้งสองเปิด auction เดียวกันของ `bob`
- [ ] alice บิด → หน้าต่าง B เห็นราคาใหม่ทันทีโดยไม่ต้อง refresh
- [ ] charlie บิดแซง → alice ได้แจ้งเตือน "You've been outbid" ภายในประมาณ 30 วินาที และเงินที่ถือไว้คืนเข้า Wallet
- [ ] กดที่แจ้งเตือน → ถูก mark ว่าอ่านแล้ว badge ลดลง และพาไปหน้า auction นั้น
- [ ] คนที่นำอยู่บิดเพิ่มเอง → ไม่มีแจ้งเตือนใหม่
- [ ] My Bids แสดง Leading / Outbid ถูกต้อง
- [ ] สร้าง auction ที่จบใน 2–3 นาที พอจบแล้ว My Bids แสดง Won / Lost ผู้ขายได้แจ้งเตือนว่าขายได้ และยอด Wallet เพิ่ม

**G. Profile และ Notifications** (AC-10, 11)
- [ ] `/profile` แสดง username, ชื่อ, อีเมล, ยอดเงิน, วันที่สมัคร และลิงก์ไปหน้าต่างๆ
- [ ] `/notifications` แสดงทุกรายการ และ mark ว่าอ่านแล้วได้

**H. Admin** (AC-24–29)
- [ ] login ด้วย admin → เมนูบัญชีมี Admin และรีสตาร์ต backend แล้วไม่มี admin ซ้ำ
- [ ] `alice` เปิด `/admin` → ขึ้น "You don't have access to this page" และเมนูของ alice ไม่มี Admin
- [ ] Dashboard: สร้าง draft ใหม่แล้วกด Refresh → ตัวเลข Drafts เพิ่ม 1
- [ ] Categories:
  - เพิ่ม "Books" → เห็นในฟอร์มสร้างและตัวกรอง
  - เปลี่ยนชื่อ → ทุกที่แสดงชื่อใหม่
  - ซ่อน → หายจากฟอร์มและตัวกรอง แต่ auction เดิมยังแสดงชื่อหมวด
  - ลบหมวดที่มี auction ใช้อยู่ หรือซ่อน/ลบ Other → กดไม่ได้และมีข้อความบอกเหตุผล
  - ใช้ชื่อซ้ำ → มี error
- [ ] Users:
  - ระงับ `charlie` ขณะ charlie เปิดเว็บอยู่ → การกระทำถัดไปของ charlie ถูกพาออกไปหน้า login
  - charlie login ใหม่ → ขึ้น "Account suspended"
  - ปลดระงับ → charlie login ได้
  - แถวของ admin ต้องไม่มีปุ่ม
- [ ] Auctions: ให้ alice นำอยู่ใน auction หนึ่ง แล้วยกเลิกโดยไม่ใส่เหตุผล → ส่งไม่ได้
- [ ] ใส่เหตุผลแล้วยกเลิก → เป็น CANCELLED และ alice ได้เงินคืนเต็มจำนวน (Wallet มีรายการ "Refund: … cancelled by admin")
- [ ] ผู้ขายและผู้บิดทุกคนได้แจ้งเตือนพร้อมเหตุผล auction หายจากหน้า `/auctions` และแถว ENDED หรือ CANCELLED ไม่มีปุ่ม Cancel

**I. Google sign-in** (AC-30)
- [ ] ยังไม่ตั้ง Client ID → หน้า login และ register ไม่มีปุ่ม Google
- [ ] ตั้งค่าตาม[หัวข้อ 4.2](#42-เปิด-google-sign-in) แล้วใช้บัญชี Google ใหม่ → ได้บัญชีใหม่ และ `/profile` แสดงยอด ฿10,000
- [ ] logout แล้วกด Google อีกครั้ง → ได้บัญชีเดิม
- [ ] บัญชีที่สร้างผ่าน Google แล้ว login ด้วยรหัสผ่าน → "Invalid username or password"
- [ ] สมัครแบบใช้รหัสผ่านด้วยอีเมลเดียวกับ Gmail แล้วกด Google → เข้าบัญชีที่สมัครไว้
- [ ] admin ระงับบัญชีนั้น → กด Google แล้วขึ้น "Account suspended"

---

## 7. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| หน้าแรกขึ้น "Unable to load auctions — Network Error" | backend ไม่ได้รัน (เช่น หลังรีสตาร์ตเครื่อง) ให้เปิด Docker Desktop แล้วรัน `docker compose up -d` หรือ `NEXT_PUBLIC_API_URL` ไม่ตรงกับพอร์ตของ backend |
| เรียก API ไม่ได้เพราะ CORS | frontend ไม่ได้รันที่พอร์ต 3000 ให้ปิดโปรแกรมที่ใช้ 3000 แล้วรัน `npm run dev` ใหม่ |
| เปิด `localhost:3000` แล้วเป็นเว็บอื่น | มีโปรแกรมหรือ container อื่นใช้พอร์ต 3000 ให้หยุดตัวนั้น เช็กได้ด้วย `docker ps` |
| Windows: เรียก `localhost:8081` แล้วค้าง แต่ `127.0.0.1:8081` ใช้ได้ | ปัญหา port relay ของ Docker Desktop/WSL ให้รีสตาร์ต Docker Desktop หรือตั้ง `NEXT_PUBLIC_API_URL=http://127.0.0.1:<port>` |
| ไม่มีเมนู Admin | ยังไม่ได้ตั้ง `ADMIN_*` ใน `.env` (ไม่ใช่ `.env.example`) หรือยังไม่รีสตาร์ต backend ถ้า log ขึ้นว่า `AdminBootstrap: ADMIN_USERNAME is not set` แปลว่า backend ไม่ได้รับค่า |
| ไม่มีปุ่ม Google | ยังไม่ได้ตั้ง `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ใน `frontend/.env.local` หรือยังไม่รัน `npm run dev` ใหม่หลังแก้ |
| กด Google แล้วได้ "Google sign-in is not configured" | backend ยังไม่มี `GOOGLE_CLIENT_ID` ให้ตั้งใน `.env` ที่ root แล้วรีสตาร์ต backend |
| กด Google แล้วได้ "Invalid Google credential" | Client ID ของ frontend กับ backend ไม่ตรงกัน |
| popup ของ Google ขึ้นว่า origin ไม่ได้รับอนุญาต | ยังไม่ได้เพิ่ม `http://localhost:3000` ใน Authorized JavaScript origins หรือเปิดเว็บผ่าน `127.0.0.1` |
| popup ของ Google ขึ้น "Access blocked" / `access_denied` | OAuth consent screen อยู่ในโหมด Testing และบัญชีนั้นไม่อยู่ใน Test users ดู[หัวข้อ 4.2](#42-เปิด-google-sign-in) |
| รูปไม่ขึ้นหลังเปิดหน้าทิ้งไว้นาน | URL ของรูปหมดอายุใน 60 นาที ให้ refresh |
| Docker แสดง backend เป็น `unhealthy` | ปัญหาที่ทราบของ HEALTHCHECK ใน Dockerfile ระบบยังใช้งานได้ปกติ |

---

## 8. ข้อจำกัดที่ทราบ
- เวลานับถอยหลังไม่เดินเอง จะอัปเดตเมื่อโหลดข้อมูลใหม่
- กระดิ่งนับเฉพาะแจ้งเตือน 20 รายการล่าสุด
- Google sign-in เชื่อมบัญชีด้วยอีเมล แต่การสมัครด้วยรหัสผ่านไม่ได้ยืนยันอีเมล ถ้ามีคนสมัครด้วยอีเมลของคนอื่นไว้ก่อน เจ้าของอีเมลตัวจริงที่กด Google จะเข้าบัญชีเดียวกันนั้น เป็นความเสี่ยงที่ยอมรับสำหรับโปรเจกต์นี้
- ไม่มี rate limit ที่ `/api/auth/*`
- ถ้า admin ถูกถอดสิทธิ์ระหว่างเปิดหน้า admin อยู่ จะเห็นข้อความ "Request failed with status code 403" จนกว่าจะ refresh

---

## 9. เอกสารอื่น
| ไฟล์ | เนื้อหา |
|---|---|
| [frontend/README.md](frontend/README.md) | โครงสร้าง frontend หน้าทั้งหมด และตัวแปร env |
| [backend/README.md](backend/README.md) | สถาปัตยกรรม backend การตั้งค่า storage/Flyway และ WebSocket |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | endpoint ทั้งหมด พร้อม request, response และ error |
| [docs/requirements.md](docs/requirements.md) | requirement และเกณฑ์ผ่าน (AC) |
| [docs/design.md](docs/design.md) | การออกแบบแต่ละรอบ |
| [docs/traceability.md](docs/traceability.md) | ผลการทดสอบของแต่ละ Unit |
