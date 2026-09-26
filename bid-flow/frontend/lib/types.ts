// =====================================================
// Auth
// =====================================================
export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  walletBalance: number;
  createdAt: string;
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
// Auction
// =====================================================
export type AuctionStatus = "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED";

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
}

export interface AuctionSummary {
  id: number;
  title: string;
  currentPrice: number;
  status: AuctionStatus;
  endTime: string;
  totalBids: number;
  sellerUsername: string;
}

export interface CreateAuctionRequest {
  title: string;
  description?: string;
  startPrice: number;
  minIncrement: number;
  startTime: string;
  endTime: string;
}

export interface UpdateAuctionRequest {
  title?: string;
  description?: string;
  startPrice?: number;
  minIncrement?: number;
  startTime?: string;
  endTime?: string;
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