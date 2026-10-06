-- =========================================
-- V2: Categories, user roles / suspension, Google sign-in
-- V1 = init-scripts/schema.sql (Flyway baseline)
-- =========================================


-- =========================================
-- 1. Categories
-- =========================================
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(50) NOT NULL,

    -- ใช้ใน URL (?category=cameras) — สร้างครั้งเดียว ไม่เปลี่ยนตามการแก้ชื่อ
    slug VARCHAR(60) NOT NULL UNIQUE,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ชื่อซ้ำแบบไม่สนตัวพิมพ์ไม่ได้
CREATE UNIQUE INDEX uniq_category_name_ci
    ON categories (LOWER(name));

-- หมวดเริ่มต้น ('other' = หมวดตั้งต้น ลบ/ซ่อนไม่ได้)
INSERT INTO categories (name, slug) VALUES
    ('Electronics',   'electronics'),
    ('Cameras',       'cameras'),
    ('Watches',       'watches'),
    ('Fashion',       'fashion'),
    ('Collectibles',  'collectibles'),
    ('Art',           'art'),
    ('Home & Living', 'home-living'),
    ('Other',         'other');


-- =========================================
-- 2. Auction Items → category (1 หมวดต่อ auction, บังคับ)
-- =========================================
ALTER TABLE auction_items
    ADD COLUMN category_id BIGINT
        REFERENCES categories(id);   -- ON DELETE RESTRICT (ค่าเริ่มต้น): ลบหมวดที่มี auction ไม่ได้

-- auction เดิมทั้งหมด → Other
UPDATE auction_items
SET category_id = (SELECT id FROM categories WHERE slug = 'other');

-- auction ตัวอย่างจาก DataSeeder (ผู้ขาย bob) → หมวดตามชนิดสินค้า
UPDATE auction_items a
SET category_id = c.id
FROM categories c, users u
WHERE u.id = a.seller_id
  AND u.username = 'bob'
  AND (
        (c.slug = 'electronics' AND a.title IN ('iPhone 15 Pro Max', 'MacBook Pro M3 14"', 'AirPods Pro 2nd Gen'))
     OR (c.slug = 'watches'     AND a.title = 'Rolex Submariner Date')
     OR (c.slug = 'cameras'     AND a.title = 'Vintage Leica M3 Camera')
  );

ALTER TABLE auction_items
    ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX idx_auction_category
    ON auction_items (category_id);


-- =========================================
-- 3. Users → role, suspension, Google account
-- =========================================
ALTER TABLE users
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CONSTRAINT check_user_role CHECK (role IN ('USER', 'ADMIN'));

ALTER TABLE users
    ADD COLUMN suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- Google "sub" (รหัสผู้ใช้ถาวรของ Google) — ว่างได้ ถ้ามีต้องไม่ซ้ำ
ALTER TABLE users
    ADD COLUMN google_sub VARCHAR(255) UNIQUE;

-- บัญชีที่สมัครผ่าน Google ไม่มีรหัสผ่าน
ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;
