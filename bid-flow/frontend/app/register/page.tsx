"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  useRedirectIfAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
  });

  const [localError, setLocalError] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLocalError(null);
    clearError();

    try {
      await register(form);
      router.push("/");
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
              Start bidding with confidence.
            </h1>

            <p className="mt-5 leading-7 text-slate-600">
              Join BidFlow to discover live auctions, place bids, and track
              your activity in one place.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Zap className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-slate-900">
                    Real-time bidding
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Follow auction activity as it happens.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-slate-900">
                    Secure transactions
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Built with a reliable and secure architecture.
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
                Create your account
              </CardTitle>

              <CardDescription>
                Join BidFlow and start exploring live auctions.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) =>
                      updateField("fullName", e.target.value)
                    }
                    placeholder="Alice Wonder"
                    className="h-11 rounded-xl"
                    required
                    minLength={1}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) =>
                      updateField("username", e.target.value)
                    }
                    placeholder="alice"
                    className="h-11 rounded-xl"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                  <p className="text-xs text-slate-500">
                    3–50 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="alice@example.com"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      updateField("password", e.target.value)
                    }
                    placeholder="••••••••"
                    className="h-11 rounded-xl"
                    required
                    minLength={8}
                    maxLength={100}
                  />
                  <p className="text-xs text-slate-500">
                    At least 8 characters
                  </p>
                </div>

                {(localError || error) && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {localError || error}
                  </div>
                )}

                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-sm font-medium text-blue-900">
                    Welcome balance
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Your account starts with a simulated balance of ฿10,000.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>

                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Sign in
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