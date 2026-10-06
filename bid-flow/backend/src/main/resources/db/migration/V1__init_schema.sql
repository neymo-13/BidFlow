-- =========================================
-- 1. Users
-- =========================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,

    -- Dummy Wallet / Mock Balance
    wallet_balance DECIMAL(15, 2) NOT NULL DEFAULT 10000.00
        CHECK (wallet_balance >= 0),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 2. Auction Items
-- =========================================
CREATE TABLE auction_items (
    id BIGSERIAL PRIMARY KEY,

    seller_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    winner_id BIGINT
        REFERENCES users(id) ON DELETE SET NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT,

    start_price DECIMAL(15, 2) NOT NULL
        CHECK (start_price >= 0),

    min_increment DECIMAL(15, 2) NOT NULL DEFAULT 1.00
        CHECK (min_increment > 0),

    current_price DECIMAL(15, 2) NOT NULL
        CHECK (current_price >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED')),

    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,

    total_bids INT NOT NULL DEFAULT 0
        CHECK (total_bids >= 0),

    version BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_times
        CHECK (end_time > start_time)
);


-- =========================================
-- 3. Item Images
-- =========================================
CREATE TABLE item_images (
    id BIGSERIAL PRIMARY KEY,

    auction_item_id BIGINT NOT NULL
        REFERENCES auction_items(id) ON DELETE CASCADE,

    -- AWS S3 Object Key
    object_key VARCHAR(500) NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 4. Bids
-- =========================================
CREATE TABLE bids (
    id BIGSERIAL PRIMARY KEY,

    auction_item_id BIGINT NOT NULL
        REFERENCES auction_items(id) ON DELETE CASCADE,

    bidder_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    bid_amount DECIMAL(15, 2) NOT NULL
        CHECK (bid_amount > 0),

    bid_sequence BIGINT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_item_bid_sequence
        UNIQUE (auction_item_id, bid_sequence)
);


-- =========================================
-- 5. Notifications
-- =========================================
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    auction_item_id BIGINT
        REFERENCES auction_items(id) ON DELETE CASCADE,

    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 6. Indexes
-- =========================================

-- Active auctions / Scheduler
CREATE INDEX idx_auction_status_endtime
    ON auction_items(status, end_time);

-- Seller's auctions
CREATE INDEX idx_auction_seller
    ON auction_items(seller_id);

-- Bid history of an auction
CREATE INDEX idx_bids_item_created
    ON bids(auction_item_id, created_at);

-- Highest bids of an auction
CREATE INDEX idx_bids_item_amount
    ON bids(auction_item_id, bid_amount DESC);

-- User's bidding history
CREATE INDEX idx_bids_bidder
    ON bids(bidder_id);

-- User's unread notifications
CREATE INDEX idx_notifications_user_read
    ON notifications(user_id, is_read, created_at);

CREATE UNIQUE INDEX uniq_primary_image_per_item
	ON item_images(auction_item_id) WHERE is_primary = TRUE;

-- =========================================
-- wallet_transactions
-- =========================================

CREATE TABLE wallet_transactions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    -- จำนวนเงิน: บวก = เข้า, ลบ = ออก
    amount DECIMAL(15, 2) NOT NULL
        CHECK (amount <> 0),

    -- ยอดเงินคงเหลือ "หลัง" transaction นี้ (snapshot)
    balance_after DECIMAL(15, 2) NOT NULL
        CHECK (balance_after >= 0),

    type VARCHAR(30) NOT NULL
        CHECK (type IN (
            'DEPOSIT',        -- ฝากเงิน
            'WITHDRAW',       -- ถอนเงิน
            'BID_HOLD',       -- กันเงินเมื่อ bid
            'BID_RELEASE',    -- คืนเงินเมื่อถูก outbid
            'AUCTION_WIN',    -- ตัดเงินจริงเมื่อชนะ
            'SELLER_PAYOUT'   -- ผู้ขายได้เงิน
        )),

    -- อ้างอิงว่ามาจากอะไร (auction_item_id, bid_id, etc.)
    reference_type VARCHAR(30),        -- 'AUCTION_ITEM', 'BID'
    reference_id BIGINT,

    -- คำอธิบายเพิ่ม (สำหรับ UI/audit)
    description VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_wallet_tx_user_created
    ON wallet_transactions(user_id, created_at DESC);

CREATE INDEX idx_wallet_tx_reference
    ON wallet_transactions(reference_type, reference_id);