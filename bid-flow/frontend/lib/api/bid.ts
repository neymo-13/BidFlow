import { api } from "../http";
import { Bid, BidSummary, Page } from "../types";

export const bidApi = {
  placeBid: async (auctionId: number, amount: number): Promise<Bid> => {
    const res = await api.post<Bid>(`/api/auctions/${auctionId}/bids`, { amount });
    return res.data;
  },

  getBids: async (
    auctionId: number,
    page = 0,
    size = 20
  ): Promise<Page<BidSummary>> => {
    const res = await api.get<Page<BidSummary>>(
      `/api/auctions/${auctionId}/bids?page=${page}&size=${size}`
    );
    return res.data;
  },
};
