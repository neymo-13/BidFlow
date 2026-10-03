"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
	AlertCircle,
	Ban,
	Banknote,
	CircleCheck,
	FilePen,
	Gavel,
	HandCoins,
	RefreshCw,
	ShieldCheck,
	UserX,
	Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import { cn } from "@/lib/utils";

interface Stat {
	label: string;
	value: string;
	icon: LucideIcon;
	tone: string; // icon colours
	href?: string;
}

const count = (n: number) => n.toLocaleString("en-US");

// Admin dashboard — numbers from GET /api/admin/stats
export default function AdminDashboardPage() {
	const { data: stats, error, isLoading, reload } = useFetch(() => adminApi.getStats(), []);

	if (error && !stats) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
					<AlertCircle className="h-8 w-8 text-red-500" />
					<p className="text-sm text-red-600">{error}</p>
					<Button variant="outline" size="sm" onClick={reload}>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	const groups: { title: string; stats: Stat[] }[] = stats
		? [
				{
					title: "Users",
					stats: [
						{ label: "Total users", value: count(stats.totalUsers), icon: Users, tone: "bg-blue-50 text-blue-600", href: "/admin/users" },
						{ label: "Suspended", value: count(stats.suspendedUsers), icon: UserX, tone: "bg-red-50 text-red-600", href: "/admin/users" },
						{ label: "Admins", value: count(stats.adminUsers), icon: ShieldCheck, tone: "bg-violet-50 text-violet-600", href: "/admin/users" },
					],
				},
				{
					title: "Auctions",
					stats: [
						{ label: "Live", value: count(stats.auctionsByStatus.ACTIVE), icon: Gavel, tone: "bg-green-50 text-green-600", href: "/admin/auctions?status=ACTIVE" },
						{ label: "Drafts", value: count(stats.auctionsByStatus.DRAFT), icon: FilePen, tone: "bg-slate-100 text-slate-600", href: "/admin/auctions?status=DRAFT" },
						{ label: "Ended", value: count(stats.auctionsByStatus.ENDED), icon: CircleCheck, tone: "bg-slate-100 text-slate-700", href: "/admin/auctions?status=ENDED" },
						{ label: "Cancelled", value: count(stats.auctionsByStatus.CANCELLED), icon: Ban, tone: "bg-red-50 text-red-600", href: "/admin/auctions?status=CANCELLED" },
					],
				},
				{
					title: "Bidding",
					stats: [
						{ label: "Total bids", value: count(stats.totalBids), icon: HandCoins, tone: "bg-amber-50 text-amber-600" },
						{ label: "Total sales", value: formatCurrency(stats.totalSales, 2), icon: Banknote, tone: "bg-emerald-50 text-emerald-600" },
					],
				},
			]
		: [];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<p className="text-sm text-slate-500">
					Total sales = final prices of auctions that ended with a winner.
				</p>
				<Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
					<RefreshCw className={cn(isLoading && "animate-spin")} />
					Refresh
				</Button>
			</div>

			{!stats ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{[...Array(8)].map((_, i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
			) : (
				groups.map((group) => (
					<section key={group.title} className="space-y-3">
						<h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">{group.title}</h2>
						<div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", isLoading && "opacity-60")}>
							{group.stats.map((stat) => (
								<StatCard key={stat.label} stat={stat} />
							))}
						</div>
					</section>
				))
			)}
		</div>
	);
}

function StatCard({ stat }: { stat: Stat }) {
	const Icon = stat.icon;
	const body = (
		<Card className={cn("h-full", stat.href && "transition-shadow hover:shadow-md")}>
			<CardContent className="flex items-center gap-4 pt-6">
				<span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", stat.tone)}>
					<Icon className="h-5 w-5" />
				</span>
				<div className="min-w-0">
					<p className="text-sm text-slate-500">{stat.label}</p>
					<p className="truncate text-2xl font-bold text-slate-950">{stat.value}</p>
				</div>
			</CardContent>
		</Card>
	);

	return stat.href ? (
		<Link href={stat.href} aria-label={`${stat.label}: ${stat.value}`}>
			{body}
		</Link>
	) : (
		body
	);
}
