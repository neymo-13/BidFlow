# สรุป AWS Services และสถาปัตยกรรมของระบบ BidFlow

ระบบ **BidFlow** เป็นแพลตฟอร์มประมูลสินค้าแบบ Real-time ที่รองรับการประมูลพร้อมกันหลายผู้ใช้งาน โดยใช้ AWS เป็นโครงสร้างพื้นฐานหลักสำหรับการ Deploy Backend, Database, Storage, Network และการให้บริการระบบผ่าน HTTPS

โครงสร้างหลักของระบบเป็นดังนี้

```text
                         User
                           |
                           | HTTPS
                           v
              ┌─────────────────────────┐
              │   AWS Amplify           │
              │   Next.js Frontend      │
              └────────────┬────────────┘
                           |
                           | HTTPS API
                           v
              ┌─────────────────────────┐
              │      CloudFront         │
              │    HTTPS Endpoint       │
              └────────────┬────────────┘
                           |
                           | HTTP :80
                           v
              ┌─────────────────────────┐
              │          ALB            │
              │ Application Load        │
              │ Balancer                │
              └────────────┬────────────┘
                           |
                           | HTTP :8080
                           v
              ┌─────────────────────────┐
              │       ECS Fargate       │
              │     BidFlow Backend     │
              │     Spring Boot         │
              └──────┬─────────┬────────┘
                     |         |
                     |         |
             PostgreSQL       Redis
                     |         |
                     v         v
              ┌──────────┐  ┌────────────┐
              │   RDS    │  │ ElastiCache│
              │PostgreSQL│  │   Valkey   │
              └──────────┘  └────────────┘

                     |
                     v
                ┌─────────┐
                │   S3    │
                │ Storage │
                └─────────┘
```

---

# 1. AWS Amplify

**หน้าที่:** Hosting สำหรับ Frontend

Frontend ของ BidFlow พัฒนาด้วย **Next.js + TypeScript** และ Deploy ขึ้น AWS Amplify

Amplify ทำหน้าที่เป็นพื้นที่สำหรับให้ผู้ใช้งานเข้าถึงหน้าเว็บไซต์ของ BidFlow โดยไม่จำเป็นต้องเปิดเครื่องคอมพิวเตอร์ของผู้พัฒนาไว้

ตัวอย่าง Production URL:

```text
https://main.d21g5ggxfktfn1.amplifyapp.com
```

### หน้าที่หลัก

* Host Frontend
* Deploy Next.js
* เชื่อมต่อกับ Git Repository
* Build และ Deploy Frontend
* ให้ HTTPS สำหรับเว็บไซต์
* รองรับการ Deploy เวอร์ชันใหม่เมื่อมีการ Push Code

### การทำงาน

```text
Developer
    |
    | git push
    v
GitHub
    |
    v
AWS Amplify
    |
    | Build
    v
Next.js Frontend
    |
    v
User Browser
```

ดังนั้น **Amplify ใช้สำหรับ Frontend ไม่ใช่ Backend**

---

# 2. Amazon CloudFront

**หน้าที่:** HTTPS Endpoint และ Distribution สำหรับรับ Request ก่อนส่งต่อไปยัง Backend

BidFlow ใช้ CloudFront อยู่ด้านหน้า Application Load Balancer

CloudFront Domain:

```text
https://d3nthj70zyzmag.cloudfront.net
```

Frontend จะเรียก API ผ่าน CloudFront แทนการเรียก ALB โดยตรง

```text
Frontend
    |
    | HTTPS
    v
CloudFront
    |
    | HTTP
    v
ALB
```

### ทำไมต้องใช้ CloudFront

Frontend ของ Amplify ทำงานผ่าน HTTPS แต่ ALB ของ BidFlow ใช้ HTTP

หาก Browser เรียก HTTP API โดยตรงจาก HTTPS Website จะเกิดปัญหา **Mixed Content**

ดังนั้นจึงใช้ CloudFront เป็น Endpoint ที่เป็น HTTPS

```text
HTTPS Frontend
      |
      v
HTTPS CloudFront
      |
      v
HTTP ALB
```

Browser จึงสามารถเรียก API ผ่าน HTTPS ได้

### Configuration สำคัญ

Viewer Protocol Policy:

```text
Redirect HTTP to HTTPS
```

Allowed HTTP Methods:

```text
GET
HEAD
OPTIONS
PUT
POST
PATCH
DELETE
```

Cache Policy:

```text
CachingDisabled
```

เนื่องจาก Backend มี API ที่ต้องรับ Request แบบ Real-time และไม่ควรให้ CloudFront Cache Response ของ API

---

# 3. Application Load Balancer (ALB)

**หน้าที่:** รับ Request จาก CloudFront และส่งต่อไปยัง ECS Backend

ชื่อ:

```text
bidflow-alb
```

ALB ทำหน้าที่เป็นตัวกลางระหว่าง CloudFront กับ ECS

```text
CloudFront
     |
     v
ALB
     |
     v
ECS
```

### Port

ALB รับ HTTP:

```text
Port 80
```

และส่งต่อไปยัง Backend:

```text
Port 8080
```

### Target Group

ระบบใช้ Target Group สำหรับจัดการ ECS Tasks เช่น

```text
bidflow-backend-blue-tg
bidflow-backend-green-tg
```

โดยใช้สำหรับการ Deploy แบบ Blue/Green

### Health Check

ALB จะตรวจสอบว่า Backend ยังทำงานอยู่หรือไม่

ระบบใช้ Endpoint:

```text
/actuator/health
```

ตัวอย่างผลลัพธ์:

```json
{
  "status": "UP"
}
```

ถ้า Task ไม่ผ่าน Health Check ALB จะไม่ส่ง Traffic ไปยัง Task นั้น

---

# 4. Amazon ECS

**หน้าที่:** รัน Backend Container

Cluster:

```text
BidFlow-Cluster
```

Service:

```text
bidflow-backend-service
```

Task Definition:

```text
BidFlow-Backend
```

Container:

```text
bidflow-backend
```

Backend พัฒนาด้วย:

```text
Java 21
Spring Boot
```

และถูกสร้างเป็น Docker Image

```text
Spring Boot
     |
     v
Docker Image
     |
     v
ECR
     |
     v
ECS Fargate
```

---

# 5. AWS Fargate

Fargate เป็นระบบ Compute ที่ ECS ใช้ในการรัน Container โดยไม่ต้องสร้างหรือดูแล EC2 Server เอง

BidFlow ใช้:

```text
ECS + Fargate
```

ดังนั้นผู้พัฒนาไม่จำเป็นต้อง

* สร้าง EC2
* ติดตั้ง Docker บน Server
* ดูแล Operating System
* Start Docker Container ด้วยตัวเองบน Server

AWS จะเป็นผู้จัดการ Infrastructure ให้

### Resource ที่ใช้

Task ใช้ประมาณ:

```text
CPU: 0.25 vCPU
Memory: 2 GB
```

Container เปิด Port:

```text
8080
```

### การเปิดระบบ

หาก ECS Service ถูกหยุดไว้:

```text
Desired tasks = 0
```

สามารถเปิด Backend โดยเปลี่ยนเป็น:

```text
Desired tasks = 1
```

ECS จะสร้าง Fargate Task ขึ้นมาเอง

เมื่อ Task:

```text
Running
```

และผ่าน:

```text
ALB Health Check
```

Backend ก็พร้อมใช้งาน

---

# 6. Amazon ECR

**หน้าที่:** เก็บ Docker Image ของ Backend

Repository:

```text
bidflow-backend
```

ECR เปรียบเสมือน Registry สำหรับเก็บ Docker Image ของระบบ

เมื่อมีการแก้ Backend จะทำงานประมาณนี้:

```text
Backend Code
     |
     v
Docker Build
     |
     v
Docker Image
     |
     v
Amazon ECR
     |
     v
Amazon ECS
```

ECS จะดึง Image จาก ECR แล้วนำไปสร้าง Container

---

# 7. Amazon RDS PostgreSQL

**หน้าที่:** Database หลักของระบบ

Database Instance:

```text
bidflow-db
```

Engine:

```text
PostgreSQL 16
```

Database:

```text
bidflow_db
```

RDS ใช้เก็บข้อมูลหลักของ BidFlow เช่น

* User
* Role
* Auction
* Auction Item
* Bid
* Wallet
* Ledger
* Category
* ข้อมูลที่เกี่ยวข้องกับระบบประมูล

Backend จะเชื่อมต่อกับ RDS ผ่าน PostgreSQL

```text
ECS Backend
      |
      | PostgreSQL
      v
RDS PostgreSQL
```

### การเปิด Database

ถ้า RDS อยู่ในสถานะ:

```text
Stopped
```

ต้องเข้า:

```text
RDS
→ Databases
→ bidflow-db
→ Actions
→ Start
```

และรอจนสถานะเป็น:

```text
Available
```

ก่อนเปิด Backend

### ลำดับที่ควรเปิด

```text
RDS
 ↓
Available
 ↓
ECS
 ↓
Running
 ↓
ALB Health Check
 ↓
ระบบพร้อมใช้งาน
```

---

# 8. Amazon ElastiCache for Valkey

**หน้าที่:** In-memory data store สำหรับระบบ Real-time และจัดการ Concurrent Bid

ระบบใช้:

```text
Valkey
```

Cluster:

```text
bidflow-redis
```

Port:

```text
6379
```

Backend ใช้ Redis/Valkey ผ่าน Redisson

หนึ่งในหน้าที่สำคัญคือใช้ Distributed Lock สำหรับการประมูล

ตัวอย่าง:

```text
auction:bid:{auctionId}
```

เมื่อมีผู้ใช้หลายคนกด Bid พร้อมกัน ระบบจะใช้ Lock เพื่อป้องกันการประมวลผลชนกัน

ตัวอย่าง:

```text
User A ──┐
         │
User B ──┼──> Redis Lock ──> Process Bid
         │
User C ──┘
```

ช่วยป้องกันปัญหา เช่น

```text
Bid พร้อมกัน
       ↓
ข้อมูลถูกเขียนชนกัน
       ↓
ราคาประมูลผิด
```

นอกจากนี้ Redis/Valkey ยังสามารถใช้สำหรับ Cache และ Pub/Sub ที่เกี่ยวข้องกับ Real-time communication ได้

---

# 9. Amazon S3

**หน้าที่:** Object Storage

Bucket:

```text
bidflow-auction
```

S3 ใช้สำหรับเก็บไฟล์หรือ Object ที่ไม่ควรเก็บไว้โดยตรงใน Database เช่น

* รูปภาพสินค้า
* ไฟล์ที่เกี่ยวข้องกับ Auction
* Object อื่น ๆ ที่ระบบต้องการเก็บ

โครงสร้างโดยรวม:

```text
Frontend / Backend
       |
       v
      S3
       |
       v
bidflow-auction
```

Database จึงไม่จำเป็นต้องเก็บไฟล์ขนาดใหญ่โดยตรง

สามารถเก็บเพียง URL หรือ Object Key ที่อ้างอิงไปยัง S3

---

# 10. AWS IAM

**หน้าที่:** จัดการสิทธิ์การเข้าถึง AWS Resources

BidFlow มี IAM Role/User หลายส่วนตามหน้าที่

ตัวอย่าง:

```text
GitHub Actions
       |
       v
BidFlowGitHubActionsPolicy
       |
       v
AWS Resources
```

และ ECS:

```text
ECS
 |
 +-- Task Execution Role
 |
 +-- Task Role
```

### Task Execution Role

ใช้สำหรับ ECS ในการทำงานที่จำเป็นต่อการเริ่ม Container เช่น

* Pull Docker Image จาก ECR
* อ่าน Secret ที่จำเป็น
* ส่ง Log ไปยัง CloudWatch

### Task Role

เป็นสิทธิ์ของ Application ที่กำลังทำงานอยู่ใน Container

เช่น Backend อาจต้องเข้าถึง:

```text
S3
Secrets Manager
```

โดยไม่ควรใช้ Access Key ที่เขียนไว้ใน Source Code

---

# 11. AWS Secrets Manager

**หน้าที่:** เก็บข้อมูลลับของระบบ

ข้อมูลที่เป็นความลับไม่ควรใส่ลงใน GitHub Repository เช่น

```text
Database Password
JWT Secret
Admin Password
API Secret
```

จึงควรเก็บไว้ใน Secrets Manager

โครงสร้าง:

```text
Secrets Manager
      |
      v
ECS Task
      |
      v
Spring Boot
```

ทำให้ Secret ไม่ต้องถูกเขียนลงใน Source Code หรือ Docker Image

---

# 12. Amazon CloudWatch

**หน้าที่:** Monitoring และ Log

เมื่อ Spring Boot Backend ทำงานบน ECS สามารถส่ง Application Log ไปยัง CloudWatch Logs

ตัวอย่าง:

```text
ECS Task
   |
   v
CloudWatch Logs
```

ใช้สำหรับตรวจสอบปัญหา เช่น

```text
Application Started
Database Connection Error
Redis Connection Error
Flyway Migration Error
Authentication Error
```

กรณี ECS Task หยุดทำงาน สามารถเข้า CloudWatch เพื่อดู Log และหาสาเหตุได้

---

# 13. Amazon VPC

**หน้าที่:** Network หลักของระบบ AWS

BidFlow ใช้ VPC สำหรับกำหนด Network ของ Resources ต่าง ๆ

โครงสร้างโดยประมาณ:

```text
VPC
│
├── Availability Zone 1a
│
└── Availability Zone 1b
```

Resources เช่น ECS, RDS และ ElastiCache จะทำงานภายใน Network ที่กำหนดไว้

VPC ช่วยควบคุมว่า Resource ใดสามารถสื่อสารกับ Resource ใดได้

---

# 14. Subnet

Subnet ใช้แบ่ง Network ภายใน VPC

BidFlow ใช้หลาย Subnet เพื่อรองรับการทำงานในมากกว่าหนึ่ง Availability Zone

ตัวอย่าง:

```text
VPC
│
├── ap-southeast-1a
│   ├── Subnet
│   └── Resources
│
└── ap-southeast-1b
    ├── Subnet
    └── Resources
```

การใช้มากกว่า 1 Availability Zone ช่วยเพิ่มความทนทานของระบบ

---

# 15. Security Group

Security Group ทำหน้าที่เป็น Firewall ระดับ Resource

ตัวอย่างการสื่อสาร:

```text
CloudFront
    |
    v
ALB
    |
    | Port 8080
    v
ECS
    |
    +---- Port 5432 ----> RDS
    |
    +---- Port 6379 ----> ElastiCache
```

แต่ละ Resource ไม่ควรเปิด Port ให้ทุกที่เข้าถึงได้

ตัวอย่างเช่น RDS PostgreSQL ควรอนุญาต Port:

```text
5432
```

เฉพาะจาก Backend ที่จำเป็นต้องเชื่อมต่อ

ส่วน Redis/Valkey ใช้:

```text
6379
```

และควรอนุญาตเฉพาะ Backend

---

# 16. AWS GitHub Actions / OIDC

ระบบมี CI/CD สำหรับ Deploy Backend อัตโนมัติ

เมื่อ Developer ทำ:

```bash
git push origin main
```

GitHub Actions จะเริ่ม Workflow

```text
Git Push
   |
   v
GitHub Actions
   |
   v
Authenticate AWS
   |
   v
Docker Build
   |
   v
Push Image → ECR
   |
   v
Register ECS Task Definition
   |
   v
Update ECS Service
   |
   v
Deploy Backend
```

ระบบใช้ **OIDC** เพื่อให้ GitHub Actions ขอสิทธิ์จาก AWS โดยไม่ต้องเก็บ AWS Access Key และ Secret Key ไว้ใน GitHub

Role ที่ใช้:

```text
BidFlowGitHubActionsPolicy
```

---

# 17. ECS Blue/Green Deployment

ระบบใช้การ Deploy แบบ Blue/Green เพื่อช่วยลดความเสี่ยงในการเปลี่ยน Version ของ Backend

แนวคิดคือมี Backend สองชุด

```text
Blue = Version เดิม
Green = Version ใหม่
```

เมื่อ Deploy Version ใหม่:

```text
Blue
  |
  | Version เดิม
  |
  v

Green
  |
  | Version ใหม่
  |
  v
```

ระบบจะสร้าง Green Task ก่อน

จากนั้นตรวจสอบ Health Check

ถ้า Green ผ่าน:

```text
Green = Healthy
```

จึงสามารถเปลี่ยน Traffic ไปยัง Version ใหม่

หาก Version ใหม่มีปัญหา สามารถป้องกันไม่ให้ Traffic ทั้งหมดถูกส่งไปยัง Version ที่มีปัญหา

---

# 18. Database Migration ด้วย Flyway

Backend ใช้ **Flyway** สำหรับจัดการ Database Schema

Migration อยู่ใน Backend เช่น:

```text
src/main/resources/db/migration/
```

ตัวอย่าง:

```text
V1__...
V2__categories_roles_google.sql
```

เมื่อ Backend เริ่มทำงาน Flyway จะตรวจสอบ Migration และปรับ Database ให้ตรงกับ Version ของ Application

```text
ECS Backend
     |
     v
Flyway
     |
     v
RDS PostgreSQL
```

ดังนั้นเวลา Deploy Backend Version ใหม่ หากมี Database Migration ใหม่ ระบบสามารถ Apply Migration ให้กับ RDS ได้

---

# 19. Spring Boot Actuator

Backend ใช้ Actuator สำหรับ Health Check

Endpoint:

```text
/actuator/health
```

ALB ใช้ Endpoint นี้ตรวจสอบ Backend

```text
ALB
 |
 | Health Check
 v
/actuator/health
 |
 +-- UP       → Healthy
 |
 +-- DOWN     → Unhealthy
```

ถ้า Backend ยัง Start ไม่เสร็จ อาจเห็น Task เป็น `Unhealthy` ชั่วคราวในช่วงแรกได้ เพราะ ALB ยังตรวจสอบไม่ผ่าน

เมื่อ Application พร้อมทำงานแล้ว Task จะเปลี่ยนเป็น Healthy

---

# 20. ภาพรวมการทำงานทั้งหมด

เมื่อ User เข้า BidFlow:

```text
                         USER
                          |
                          | HTTPS
                          v
                ┌──────────────────┐
                │   AWS Amplify    │
                │ Next.js Frontend │
                └────────┬─────────┘
                         |
                         | HTTPS API
                         v
                ┌──────────────────┐
                │    CloudFront    │
                └────────┬─────────┘
                         |
                         | HTTP :80
                         v
                ┌──────────────────┐
                │       ALB        │
                └────────┬─────────┘
                         |
                         | HTTP :8080
                         v
                ┌──────────────────┐
                │   ECS Fargate    │
                │ Spring Boot      │
                └────┬─────┬───────┘
                     |     |
          PostgreSQL |     | Redis/Valkey
                     |     |
                     v     v
               ┌───────┐ ┌───────────┐
               │  RDS  │ │ElastiCache│
               │  PG   │ │  Valkey   │
               └───────┘ └───────────┘
                     |
                     |
                     +──────────────┐
                                    |
                                    v
                              ┌───────────┐
                              │    S3     │
                              │  Storage  │
                              └───────────┘
```

---

# 21. Service ที่ใช้แบ่งตามหน้าที่

| AWS Service               | หน้าที่                                  |
| ------------------------- | ---------------------------------------- |
| **Amplify**               | Host และ Deploy Frontend                 |
| **CloudFront**            | HTTPS Endpoint และส่ง Request ไป Backend |
| **ALB**                   | รับ Traffic และส่งต่อไป ECS              |
| **ECS**                   | จัดการ Backend Container                 |
| **Fargate**               | Compute สำหรับรัน Container              |
| **ECR**                   | เก็บ Docker Image                        |
| **RDS PostgreSQL**        | Database หลัก                            |
| **ElastiCache Valkey**    | Redis/Lock/Cache/Real-time support       |
| **S3**                    | เก็บไฟล์และ Object                       |
| **IAM**                   | จัดการสิทธิ์                             |
| **Secrets Manager**       | เก็บข้อมูลลับ                            |
| **CloudWatch**            | Log และ Monitoring                       |
| **VPC**                   | Network ของระบบ                          |
| **Subnet**                | แบ่ง Network                             |
| **Security Group**        | Firewall / ควบคุม Traffic                |
| **GitHub Actions + OIDC** | CI/CD และ Deploy อัตโนมัติ               |
| **Flyway**                | Database Migration                       |
| **ECS Blue/Green**        | Deploy Backend แบบลด Downtime            |
| **Spring Boot Actuator**  | Health Check                             |

---

# 22. ขั้นตอน Deploy Backend ตั้งแต่ Code จนถึง AWS

เมื่อ Developer Push Code:

```text
1. Developer
      |
      | git push
      v
2. GitHub
      |
      v
3. GitHub Actions
      |
      | Authenticate ด้วย OIDC
      v
4. AWS IAM Role
      |
      v
5. Docker Build
      |
      v
6. Amazon ECR
      |
      | Push Docker Image
      v
7. ECS Task Definition
      |
      v
8. ECS Service
      |
      v
9. Fargate Task
      |
      v
10. ALB Health Check
      |
      v
11. Blue/Green Deployment
      |
      v
12. Backend Version ใหม่พร้อมใช้งาน
```

---

# 23. ขั้นตอนการเปิดระบบหลังจากหยุดไว้

ถ้าระบบถูกปิดเพื่อประหยัดค่าใช้จ่าย ให้เปิดตามลำดับ:

### ขั้นที่ 1 — RDS

```text
RDS
→ Databases
→ bidflow-db
→ Start
```

รอ:

```text
Available
```

### ขั้นที่ 2 — ECS

```text
ECS
→ BidFlow-Cluster
→ bidflow-backend-service
→ Desired tasks = 1
```

รอ:

```text
Running
```

### ขั้นที่ 3 — ตรวจสอบ Health

ตรวจสอบ Target Group ของ ALB

ต้องเห็นประมาณ:

```text
Healthy
```

### ขั้นที่ 4 — ทดสอบ Backend

ทดสอบ:

```text
/actuator/health
```

ถ้าได้:

```json
{
  "status": "UP"
}
```

แสดงว่า Backend พร้อมใช้งาน

### ขั้นที่ 5 — เปิด Frontend

เข้าเว็บไซต์ผ่าน Amplify:

```text
https://main.d21g5ggxfktfn1.amplifyapp.com
```

---

# 24. ขั้นตอนการปิดระบบเมื่อไม่ใช้งาน

หากต้องการหยุดระบบชั่วคราว:

### 1. หยุด ECS

```text
ECS
→ BidFlow-Cluster
→ bidflow-backend-service
→ Desired tasks = 0
```

### 2. หยุด RDS

```text
RDS
→ bidflow-db
→ Actions
→ Stop temporarily
```

จากนั้นรอจน:

```text
Stopped
```

### สิ่งที่ต้องระวัง

ไม่ใช่ทุก AWS Service สามารถกด Stop ได้

ตัวอย่าง:

```text
ECS Fargate       → ลด Desired tasks เป็น 0
RDS               → Stop ได้ชั่วคราว
ElastiCache       → ไม่มี Stop แบบ RDS
ALB               → ไม่มีปุ่ม Stop
CloudFront        → ไม่มีปุ่ม Stop
S3                → ไม่มีปุ่ม Stop
ECR               → ไม่มีปุ่ม Stop
```

ดังนั้นถ้าต้องการหยุดระบบชั่วคราว **ไม่ควรลบ Resource เหล่านี้เพียงเพื่อหยุดการใช้งาน** เพราะการสร้างกลับมาใหม่อาจต้องตั้งค่าหลายอย่างอีกครั้ง

---

# 25. Region ที่ใช้

ทรัพยากรหลักของ BidFlow อยู่ที่ Region:

```text
Asia Pacific (Singapore)
ap-southeast-1
```

ดังนั้นเวลาจัดการ Resource ใน AWS Console ต้องตรวจสอบ Region ด้านขวาบนให้เป็น:

```text
Singapore
```

ถ้าเลือก Region อื่น เช่น Tokyo หรือ N. Virginia อาจดูเหมือนว่าไม่มี ECS, RDS, ECR หรือ ElastiCache ของ BidFlow เพราะ Resource เหล่านี้เป็น Regional Resources

---

# 26. สรุป Architecture แบบสั้น

BidFlow ใช้ AWS โดยแบ่งเป็น 5 ส่วนหลัก

### Frontend

```text
AWS Amplify
```

ใช้ Host Next.js Frontend

### API / Backend

```text
CloudFront
    ↓
ALB
    ↓
ECS Fargate
```

ใช้ให้บริการ Spring Boot Backend

### Data

```text
RDS PostgreSQL
ElastiCache Valkey
S3
```

ใช้สำหรับ Database, Cache/Distributed Lock และ File Storage

### Security / Network

```text
IAM
Secrets Manager
VPC
Subnet
Security Group
```

ใช้ควบคุมสิทธิ์ ความปลอดภัย และ Network

### Deployment / Monitoring

```text
GitHub Actions
OIDC
ECR
ECS Blue/Green
CloudWatch
Flyway
```

ใช้สำหรับ CI/CD, Container Image, Deployment, Logging และ Database Migration

ดังนั้นภาพรวมของ BidFlow คือ

```text
Frontend
   ↓
Amplify
   ↓
CloudFront
   ↓
ALB
   ↓
ECS Fargate
   ├── RDS PostgreSQL
   ├── ElastiCache Valkey
   └── S3

Security:
IAM + Secrets Manager + Security Groups

Network:
VPC + Subnets + Availability Zones

Deployment:
GitHub Actions + OIDC
        ↓
       ECR
        ↓
       ECS

Monitoring:
CloudWatch + ALB Health Check
```
