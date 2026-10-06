import axios, { AxiosError } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// =====================================================
// Axios Instance
// =====================================================
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// =====================================================
// Request Interceptor — Attach JWT token
// =====================================================
api.interceptors.request.use(
  (config) => {
    // Only in browser
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================================
// Response Interceptor — Handle 401
// =====================================================
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 401 Unauthorized → clear token + redirect to login
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Don't redirect if already on login/register
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/register")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// =====================================================
// Error helper — Extract message from response
// =====================================================
export interface ApiError {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
  details?: Record<string, string> | null;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown error occurred";
}