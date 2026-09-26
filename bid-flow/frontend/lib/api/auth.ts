import { api } from "../http";
import { AuthResponse, LoginRequest, RegisterRequest, User } from "../types";

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/api/auth/register", data);
    return res.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/api/auth/login", data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>("/api/users/me");
    return res.data;
  },
};
