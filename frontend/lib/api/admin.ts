import { api } from "../http";
import {
  AdminAuctionFilters,
  AdminCategory,
  AdminStats,
  AdminUser,
  AuctionSummary,
  CancelAuctionRequest,
  CreateCategoryRequest,
  Page,
  UpdateCategoryRequest,
} from "../types";

// Every call needs role ADMIN — the backend answers 401 (not logged in) / 403 (not an admin)
export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>("/api/admin/stats");
    return res.data;
  },

  // ---------- Users ----------
  // q matches username, email or full name (case-insensitive) · newest first · size ≤ 50
  listUsers: async (q?: string, page = 0, size = 20): Promise<Page<AdminUser>> => {
    const params = new URLSearchParams();
    if (q) params.append("q", q);
    params.append("page", String(page));
    params.append("size", String(size));

    const res = await api.get<Page<AdminUser>>(`/api/admin/users?${params}`);
    return res.data;
  },

  // Admins cannot be suspended (400)
  suspendUser: async (id: number): Promise<AdminUser> => {
    const res = await api.post<AdminUser>(`/api/admin/users/${id}/suspend`);
    return res.data;
  },

  unsuspendUser: async (id: number): Promise<AdminUser> => {
    const res = await api.post<AdminUser>(`/api/admin/users/${id}/unsuspend`);
    return res.data;
  },

  // ---------- Auctions ----------
  listAuctions: async (
    filters: AdminAuctionFilters = {},
    page = 0,
    size = 20
  ): Promise<Page<AuctionSummary>> => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.q) params.append("q", filters.q);
    params.append("page", String(page));
    params.append("size", String(size));

    const res = await api.get<Page<AuctionSummary>>(`/api/admin/auctions?${params}`);
    return res.data;
  },

  // DRAFT / ACTIVE only · refunds the leading bid and notifies the seller and every bidder
  cancelAuction: async (id: number, data: CancelAuctionRequest): Promise<void> => {
    await api.post(`/api/admin/auctions/${id}/cancel`, data);
  },

  // ---------- Categories ----------
  // Includes hidden categories
  listCategories: async (): Promise<AdminCategory[]> => {
    const res = await api.get<AdminCategory[]>("/api/admin/categories");
    return res.data;
  },

  // Duplicate name (case-insensitive) → 409
  createCategory: async (data: CreateCategoryRequest): Promise<AdminCategory> => {
    const res = await api.post<AdminCategory>("/api/admin/categories", data);
    return res.data;
  },

  // Hiding "Other" → 400 · duplicate name → 409
  updateCategory: async (id: number, data: UpdateCategoryRequest): Promise<AdminCategory> => {
    const res = await api.patch<AdminCategory>(`/api/admin/categories/${id}`, data);
    return res.data;
  },

  // Category in use → 409 · "Other" → 400
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/api/admin/categories/${id}`);
  },
};
