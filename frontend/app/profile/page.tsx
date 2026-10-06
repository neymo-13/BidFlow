"use client";

import Link from "next/link";
import { AlertCircle, Bell, CalendarDays, Gavel, HandCoins, Mail, PlusCircle, Wallet } from "lucide-react";

import { RequireAuth } from "@/components/auth/auth-guard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
	{ href: "/wallet", label: "Wallet", description: "Deposit, withdraw and history", icon: Wallet },
	{ href: "/bids", label: "My Bids", description: "Auctions you are bidding on", icon: HandCoins },
	{ href: "/auctions/my", label: "My Auctions", description: "Manage items you sell", icon: Gavel },
	{ href: "/notifications", label: "Notifications", description: "Wins, sales and updates", icon: Bell },
	{ href: "/auctions/create", label: "Sell an item", description: "Create a new auction", icon: PlusCircle },
];

export default function ProfilePage() {
	return (
		<RequireAuth>
			<ProfileContent />
		</RequireAuth>
	);
}

function ProfileContent() {
	// Fetch fresh data (the navbar copy may be older)
	const { data: user, error, isLoading, reload } = useFetch(() => authApi.getMe(), []);

	return (
		<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
			<h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Profile</h1>

			{error && !user ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
						<AlertCircle className="h-8 w-8 text-red-500" />
						<p className="text-sm text-red-600">{error}</p>
						<Button variant="outline" size="sm" onClick={reload}>
							Retry
						</Button>
					</CardContent>
				</Card>
			) : isLoading && !user ? (
				<Card>
					<CardContent className="flex items-center gap-4 pt-6">
						<Skeleton className="h-16 w-16 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-24" />
						</div>
					</CardContent>
				</Card>
			) : user ? (
				<div className="space-y-6">
					<Card>
						<CardContent className="pt-6">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
								<Avatar className="h-16 w-16">
									<AvatarFallback className="bg-blue-600 text-2xl font-semibold text-white">
										{user.username?.[0]?.toUpperCase() ?? "U"}
									</AvatarFallback>
								</Avatar>

								<div className="min-w-0">
									<p className="truncate text-xl font-semibold text-slate-950">{user.fullName}</p>
									<p className="text-sm text-slate-500">@{user.username}</p>
								</div>
							</div>

							<Separator className="my-5" />

							<dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div>
									<dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
										<Mail className="h-3.5 w-3.5" />
										Email
									</dt>
									<dd className="mt-1 truncate text-sm text-slate-900">{user.email}</dd>
								</div>
								<div>
									<dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
										<CalendarDays className="h-3.5 w-3.5" />
										Member since
									</dt>
									<dd className="mt-1 text-sm text-slate-900">{formatDateTime(user.createdAt)}</dd>
								</div>
								<div>
									<dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
										<Wallet className="h-3.5 w-3.5" />
										Wallet balance
									</dt>
									<dd className="mt-1 text-sm font-semibold text-emerald-600">
										{formatCurrency(Number(user.walletBalance), 2)}
									</dd>
								</div>
							</dl>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Quick links</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
								<Link
									key={href}
									href={href}
									className={cn(buttonVariants({ variant: "outline" }), "h-auto justify-start gap-3 p-3 text-left")}
								>
									<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
										<Icon className="h-4 w-4" />
									</span>
									<span className="min-w-0">
										<span className="block text-sm font-medium text-slate-900">{label}</span>
										<span className="block truncate text-xs font-normal text-slate-500">{description}</span>
									</span>
								</Link>
							))}
						</CardContent>
					</Card>
				</div>
			) : null}
		</div>
	);
}
