import { api } from "../http";
import {
  Auction,
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
    size = 20
  ): Promise<Page<AuctionSummary>> => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
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

  getMyAuctions: async (page = 0, size = 20): Promise<Page<AuctionSummary>> => {
    const res = await api.get<Page<AuctionSummary>>(
      `/api/auctions/my?page=${page}&size=${size}`
    );
    return res.data;
  },
};
