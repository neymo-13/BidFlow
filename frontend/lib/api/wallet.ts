import { api } from "../http";
import { Page, WalletResponse, WalletTransaction } from "../types";

export const walletApi = {
  getMyWallet: async (): Promise<WalletResponse> => {
    const res = await api.get<WalletResponse>("/api/wallet/me");
    return res.data;
  },

  deposit: async (amount: number): Promise<WalletTransaction> => {
    const res = await api.post<WalletTransaction>("/api/wallet/me/deposit", { amount });
    return res.data;
  },

  withdraw: async (amount: number): Promise<WalletTransaction> => {
    const res = await api.post<WalletTransaction>("/api/wallet/me/withdraw", { amount });
    return res.data;
  },

  getTransactions: async (page = 0, size = 20): Promise<Page<WalletTransaction>> => {
    const res = await api.get<Page<WalletTransaction>>(
      `/api/wallet/me/transactions?page=${page}&size=${size}`
    );
    return res.data;
  },
};
