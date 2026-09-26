"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gavel, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRedirectIfAuth } from "@/lib/hooks/use-auth";
import { getErrorMessage } from "@/lib/http";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect") || "/";

  const { login, isLoading, error, clearError } = useAuthStore();

  useRedirectIfAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLocalError(null);
    clearError();

    try {
      await login({ username, password });
      router.push(redirect);
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* Left */}
        <div className="hidden flex-col justify-center px-10 lg:flex">
          <div className="max-w-md">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Gavel className="h-5 w-5" />
              </div>

              <span className="text-xl font-bold text-slate-950">
                BidFlow
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Welcome back.
            </h1>

            <p className="mt-5 leading-7 text-slate-600">
              Sign in to continue bidding and keep track of your live
              auctions.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Zap className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-slate-900">
                    Live auction updates
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Stay updated with current auction activity.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-slate-900">
                    Secure account
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Your bidding activity stays protected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                Sign in
              </CardTitle>

              <CardDescription>
                Welcome back to BidFlow.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alice"
                    className="h-11 rounded-xl"
                    required
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {(localError || error) && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {localError || error}
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-700">
                    Demo account
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    alice / password123
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>

                <p className="text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Create an account
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-sm text-slate-500">Loading...</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
