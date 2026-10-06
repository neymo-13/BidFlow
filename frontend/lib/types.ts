// =====================================================
// Auth
// =====================================================
// UI only (e.g. showing the Admin menu) — the backend checks the role on every request
export type Role = "USER" | "ADMIN";

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  walletBalance: number;
  createdAt: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  username: string;
  email: string;
  fullName: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// credential = the ID token from the Google Identity Services button
export interface GoogleLoginRequest {
  credential: string;
}

// =====================================================
// Wallet
// =====================================================
export interface WalletResponse {
  userId: number;
  username: string;
  balance: number;
}

export interface WalletTransaction {
  id: number;
  type: "DEPOSIT" | "WITHDRAW" | "BID_HOLD" | "BID_RELEASE" | "WIN_PAYMENT" | "SELLER_PAYOUT";
  amount: number;
  balanceAfter: number;
  referenceType: "AUCTION_ITEM" | "BID" | null;
  referenceId: number | null;
  description: string;
  createdAt: string;
}

// =====================================================
// Category
// =====================================================
// slug is the value used in URLs (?category=cameras)
export interface Category {
  id: number;
  name: string;
  slug: string;
}

// =====================================================
// Auction
// =====================================================
export type AuctionStatus = "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED";

// Sort keys accepted by GET /api/auctions (anything else → 400)
export type AuctionSort = "newest" | "endingSoon" | "priceAsc" | "priceDesc" | "mostBids";

// url is a short-lived presigned URL (private bucket) — don't store it
export interface AuctionImage {
  id: number;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface Auction {
  id: number;
  sellerId: number;
  sellerUsername: string;
  winnerId: number | null;
  winnerUsername: string | null;
  title: string;
  description: string | null;
  startPrice: number;
  minIncrement: number;
  currentPrice: number;
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  totalBids: number;
  createdAt: string;
  updatedAt: string;
  images: AuctionImage[]; // ordered by displayOrder, primary first
  category: Category; // may be a hidden category (still shown on existing auctions)
}

export interface AuctionSummary {
  id: number;
  title: string;
  currentPrice: number;
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  totalBids: number;
  sellerUsername: string;
  primaryImageUrl: string | null;
  category: Category;
}

export interface AuctionListFilters {
  q?: string;
  sort?: AuctionSort;
  category?: string; // slug of a visible category — unknown / hidden → 400
}

export interface CreateAuctionRequest {
  title: string;
  description?: string;
  startPrice: number;
  minIncrement: number;
  startTime: string;
  endTime: string;
  categoryId: number;
}

export interface UpdateAuctionRequest {
  title?: string;
  description?: string;
  startPrice?: number;
  minIncrement?: number;
  startTime?: string;
  endTime?: string;
  categoryId?: number; // omit (or send the current id) to keep the category
}

// =====================================================
// Bid
// =====================================================
export interface PlaceBidRequest {
  amount: number;
}

export interface Bid {
  id: number;
  auctionItemId: number;
  bidderId: number;
  bidderUsername: string;
  bidAmount: number;
  bidSequence: number;
  createdAt: string;
}

export interface BidSummary {
  id: number;
  bidderUsername: string;
  bidAmount: number;
  bidSequence: number;
  createdAt: string;
}

// ACTIVE → LEADING / OUTBID · ENDED → WON / LOST
export type MyBidResult = "LEADING" | "OUTBID" | "WON" | "LOST" | "CANCELLED";

// One row per auction the user has bid on (GET /api/bids/me)
export interface MyBid {
  auctionId: number;
  title: string;
  status: AuctionStatus;
  currentPrice: number;
  endTime: string;
  myHighestBid: number;
  myBidCount: number;
  lastBidAt: string;
  result: MyBidResult;
  primaryImageUrl: string | null;
}

// =====================================================
// Notification
// =====================================================
export interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  auctionItemId: number | null;
  createdAt: string;
}

// =====================================================
// Admin (every /api/admin/** call needs role ADMIN)
// =====================================================
export interface AdminCategory extends Category {
  active: boolean; // false = hidden from the public list, filter and forms
  auctionCount: number; // auctions of any status using this category
}

export interface CreateCategoryRequest {
  name: string;
}

// Send only what changes — the slug never changes
export interface UpdateCategoryRequest {
  name?: string;
  active?: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  suspended: boolean;
  googleLinked: boolean;
  walletBalance: number;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  auctionsByStatus: Record<AuctionStatus, number>; // every status present, 0 when none
  totalBids: number;
  totalSales: number; // sum of final prices of auctions that ended with a winner
}

export interface AdminAuctionFilters {
  status?: AuctionStatus; // all statuses (incl. DRAFT / CANCELLED) when omitted
  q?: string;
}

export interface CancelAuctionRequest {
  reason: string; // 1–500 characters, shown to the seller and bidders
}

// =====================================================
// Common
// =====================================================
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// =====================================================
// WebSocket Events
// =====================================================
export type BidEventType = "BID_PLACED" | "AUCTION_ENDED";

export interface BidEvent {
  type: BidEventType;
  auctionId: number;
  bidId: number;
  bidderId: number;
  bidderUsername: string;
  amount: number;
  sequence: number;
  currentPrice: number;
  timestamp: string;
}