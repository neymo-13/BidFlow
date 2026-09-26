import { create } from "zustand";
import { authApi } from "@/lib/api";
import { AuthResponse, LoginRequest, RegisterRequest, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  // =====================================================
  // Login
  // =====================================================
  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res: AuthResponse = await authApi.login(data);
      saveAuth(res);
      const user = await authApi.getMe();
      set({ user, token: res.token, isLoading: false });
    } catch (err: any) {
      const message = err?.response?.data?.message || "Login failed";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // =====================================================
  // Register
  // =====================================================
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res: AuthResponse = await authApi.register(data);
      saveAuth(res);
      const user = await authApi.getMe();
      set({ user, token: res.token, isLoading: false });
    } catch (err: any) {
      const message = err?.response?.data?.message || "Registration failed";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // =====================================================
  // Logout
  // =====================================================
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    set({ user: null, token: null, error: null });
  },

  // =====================================================
  // Load user on app start
  // =====================================================
  loadUser: async () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) {
      set({ isInitialized: true });
      return;
    }

    try {
      const user = await authApi.getMe();
      set({ user, token, isInitialized: true });
    } catch {
      // Token invalid/expired → clear
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      set({ user: null, token: null, isInitialized: true });
    }
  },

  clearError: () => set({ error: null }),
}));

// =====================================================
// Helpers
// =====================================================
function saveAuth(res: AuthResponse) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", res.token);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: res.userId,
        username: res.username,
        email: res.email,
        fullName: res.fullName,
      })
    );
  }
}
