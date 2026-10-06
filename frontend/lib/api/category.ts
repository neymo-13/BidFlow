import { api } from "../http";
import { Category } from "../types";

export const categoryApi = {
  // Visible categories only, sorted by name with "Other" last (public)
  list: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>("/api/categories");
    return res.data;
  },
};
