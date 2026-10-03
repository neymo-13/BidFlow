import { api } from "../http";
import {
  Auction,
  AuctionImage,
  AuctionListFilters,
  AuctionStatus,
  AuctionSummary,
  CreateAuctionRequest,
  Page,
  UpdateAuctionRequest,
} from "../types";

export const auctionApi = {
  list: async (
    status?: AuctionStatus,
    page = 0,
    size = 20,
    filters: AuctionListFilters = {}
  ): Promise<Page<AuctionSummary>> => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (filters.q) params.append("q", filters.q);
    if (filters.sort) params.append("sort", filters.sort);
    if (filters.category) params.append("category", filters.category);
    params.append("page", String(page));
    params.append("size", String(size));

    const res = await api.get<Page<AuctionSummary>>(`/api/auctions?${params}`);
    return res.data;
  },

  getById: async (id: number): Promise<Auction> => {
    const res = await api.get<Auction>(`/api/auctions/${id}`);
    return res.data;
  },

  create: async (data: CreateAuctionRequest): Promise<Auction> => {
    const res = await api.post<Auction>("/api/auctions", data);
    return res.data;
  },

  update: async (id: number, data: UpdateAuctionRequest): Promise<Auction> => {
    const res = await api.put<Auction>(`/api/auctions/${id}`, data);
    return res.data;
  },

  cancel: async (id: number): Promise<void> => {
    await api.delete(`/api/auctions/${id}`);
  },

  // DRAFT → ACTIVE (owner only)
  publish: async (id: number): Promise<Auction> => {
    const res = await api.post<Auction>(`/api/auctions/${id}/publish`);
    return res.data;
  },

  // DRAFT only · JPEG / PNG / WebP ≤ 5 MB · max 5 images
  uploadImage: async (id: number, file: File): Promise<AuctionImage> => {
    const form = new FormData();
    form.append("file", file);
    // Override the instance's JSON Content-Type: axios would otherwise turn FormData into JSON.
    // With multipart/form-data axios lets the browser add the boundary itself.
    const res = await api.post<AuctionImage>(`/api/auctions/${id}/images`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteImage: async (id: number, imageId: number): Promise<void> => {
    await api.delete(`/api/auctions/${id}/images/${imageId}`);
  },

  getMyAuctions: async (page = 0, size = 20): Promise<Page<AuctionSummary>> => {
    const res = await api.get<Page<AuctionSummary>>(
      `/api/auctions/my?page=${page}&size=${size}`
    );
    return res.data;
  },
};
