"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, Eye, Gavel, HandCoins, TrendingUp } from "lucide-react";

import { RequireAuth } from "@/components/auth/auth-guard";
import { AuctionThumb } from "@/components/auction/auction-card";
import { Pagination } from "@/components/common/pagination";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { bidApi } from "@/lib/api";
import { formatCurrency, formatDateTime, timeRemaining } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { MyBid, MyBidResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const RESULT_BADGE: Record<MyBidResult, { label: string; className: string }> = {
	LEADING: { label: "Leading", className: "bg-emerald-500 text-white" },
	OUTBID: { label: "Outbid", className: "bg-orange-500 text-white" },
	WON: { label: "Won", className: "bg-amber-400 text-amber-950" },
	LOST: { label: "Lost", className: "bg-slate-400 text-white" },
	CANCELLED: { label: "Cancelled", className: "bg-red-500 text-white" },
};

export default function MyBidsPage() {
	return (
		<RequireAuth>
			<MyBidsContent />
		</RequireAuth>
	);
}

function MyBidsContent() {
	const [page, setPage] = useState(0);
	const { data, error, isLoading, reload } = useFetch(() => bidApi.getMyBids(page, PAGE_SIZE), [page]);
	const items = data?.content ?? [];

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">My Bids</h1>
				<p className="mt-1 text-sm text-slate-500">Auctions you have bid on, most recent first.</p>
			</div>

			{error && !isLoading ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<AlertCircle className="h-8 w-8 text-red-500" />
						<p className="text-sm text-red-600">{error}</p>
						<Button variant="outline" size="sm" onClick={reload}>
							Retry
						</Button>
					</CardContent>
				</Card>
			) : isLoading && !data ? (
				<div className="space-y-3">
					{[...Array(4)].map((_, i) => (
						<Skeleton key={i} className="h-24 w-full rounded-xl" />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
						<HandCoins className="h-7 w-7 text-slate-400" />
					</div>
					<h2 className="font-semibold text-slate-900">You haven&apos;t placed any bids yet</h2>
					<p className="mt-1 text-sm text-slate-500">Find something you like and make an offer.</p>
					<Link href="/auctions" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
						<Gavel />
						Browse auctions
					</Link>
				</div>
			) : (
				<div className="space-y-6">
					<ul className={`space-y-3 ${isLoading ? "opacity-60" : ""}`}>
						{items.map((bid) => (
							<MyBidRow key={bid.auctionId} bid={bid} />
						))}
					</ul>

					<Pagination
						page={data?.number ?? 0}
						totalPages={data?.totalPages ?? 0}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>
			)}
		</div>
	);
}

function MyBidRow({ bid }: { bid: MyBid }) {
	const badge = RESULT_BADGE[bid.result];
	const canBidAgain = bid.result === "OUTBID" && bid.status === "ACTIVE";
	const isOpen = bid.status === "ACTIVE";

	return (
		<li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<Link
					href={`/auctions/${bid.auctionId}`}
					className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 sm:block"
				>
					<AuctionThumb src={bid.primaryImageUrl} alt={bid.title} />
				</Link>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<Badge className={cn("border-0", badge.className)}>{badge.label}</Badge>
						<Link
							href={`/auctions/${bid.auctionId}`}
							className="truncate font-semibold text-slate-900 hover:text-blue-600"
						>
							{bid.title}
						</Link>
					</div>

					<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
						<span>
							<span className="text-slate-400">My highest </span>
							<span className="font-semibold text-slate-900">{formatCurrency(bid.myHighestBid)}</span>
						</span>
						<span>
							<span className="text-slate-400">{isOpen ? "Current " : "Final "}</span>
							<span className="font-semibold text-blue-600">{formatCurrency(bid.currentPrice)}</span>
						</span>
						<span className="flex items-center gap-1">
							<TrendingUp className="h-4 w-4" />
							{bid.myBidCount} {bid.myBidCount === 1 ? "bid" : "bids"} by me
						</span>
						<span className="flex items-center gap-1">
							<Clock className="h-4 w-4" />
							{isOpen ? timeRemaining(bid.endTime) : `Ended ${formatDateTime(bid.endTime)}`}
						</span>
					</div>
					<p className="mt-1 text-xs text-slate-400">Last bid {formatDateTime(bid.lastBidAt)}</p>
				</div>

				<div className="flex shrink-0 gap-2">
					{canBidAgain ? (
						<Link
							href={`/auctions/${bid.auctionId}`}
							className={cn(buttonVariants({ size: "sm" }), "bg-blue-600 hover:bg-blue-700")}
						>
							<Gavel />
							Bid again
						</Link>
					) : (
						<Link
							href={`/auctions/${bid.auctionId}`}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							<Eye />
							View
						</Link>
					)}
				</div>
			</div>
		</li>
	);
}
