"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, Clock, Eye, Gavel, Loader2, Pencil, PlusCircle, Rocket, TrendingUp, XCircle } from "lucide-react";

import { RequireAuth } from "@/components/auth/auth-guard";
import { AuctionThumb, StatusBadge } from "@/components/auction/auction-card";
import { PublishAuctionDialog } from "@/components/auction/publish-dialog";
import { Pagination } from "@/components/common/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auctionApi } from "@/lib/api";
import { formatCurrency, formatDateTime, timeRemaining } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import { getErrorMessage } from "@/lib/http";
import { AuctionStatus, AuctionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// The /my endpoint has no status filter, so tabs filter the loaded page on the client
const PAGE_SIZE = 100;

const TABS: { value: "ALL" | AuctionStatus; label: string }[] = [
	{ value: "ALL", label: "All" },
	{ value: "DRAFT", label: "Draft" },
	{ value: "ACTIVE", label: "Active" },
	{ value: "ENDED", label: "Ended" },
	{ value: "CANCELLED", label: "Cancelled" },
];

type TabValue = (typeof TABS)[number]["value"];

export default function MyAuctionsPage() {
	return (
		<RequireAuth>
			<MyAuctionsContent />
		</RequireAuth>
	);
}

function MyAuctionsContent() {
	const [page, setPage] = useState(0);
	const [tab, setTab] = useState<TabValue>("ALL");
	const [toCancel, setToCancel] = useState<AuctionSummary | null>(null);
	const [cancelling, setCancelling] = useState(false);
	const [toPublish, setToPublish] = useState<AuctionSummary | null>(null);

	const { data, error, isLoading, reload } = useFetch(() => auctionApi.getMyAuctions(page, PAGE_SIZE), [page]);

	const auctions = data?.content ?? [];
	const visible = tab === "ALL" ? auctions : auctions.filter((a) => a.status === tab);
	const countFor = (value: TabValue) =>
		value === "ALL" ? auctions.length : auctions.filter((a) => a.status === value).length;

	const handleConfirmCancel = async () => {
		if (!toCancel) return;
		setCancelling(true);
		try {
			await auctionApi.cancel(toCancel.id);
			toast.success(`"${toCancel.title}" was cancelled`);
			setToCancel(null);
			reload();
		} catch (e) {
			toast.error(getErrorMessage(e));
		} finally {
			setCancelling(false);
		}
	};

	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">My Auctions</h1>
					<p className="mt-1 text-sm text-slate-500">Items you are selling on BidFlow.</p>
				</div>
				<Link href="/auctions/create" className={cn(buttonVariants(), "h-10 bg-blue-600 px-4 hover:bg-blue-700")}>
					<PlusCircle />
					Sell an item
				</Link>
			</div>

			<Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)} className="mb-5">
				<div className="overflow-x-auto pb-1">
					<TabsList>
						{TABS.map((t) => (
							<TabsTrigger key={t.value} value={t.value} className="px-3">
								{t.label}
								{data && <span className="text-xs text-slate-400">{countFor(t.value)}</span>}
							</TabsTrigger>
						))}
					</TabsList>
				</div>
			</Tabs>

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
			) : auctions.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
						<Gavel className="h-7 w-7 text-slate-400" />
					</div>
					<h2 className="font-semibold text-slate-900">You haven&apos;t created any auctions yet</h2>
					<p className="mt-1 text-sm text-slate-500">List your first item and start receiving bids.</p>
					<Link href="/auctions/create" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
						Sell an item
					</Link>
				</div>
			) : visible.length === 0 ? (
				<p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
					No auctions in this tab.
				</p>
			) : (
				<div className="space-y-6">
					<ul className={`space-y-3 ${isLoading ? "opacity-60" : ""}`}>
						{visible.map((auction) => (
							<MyAuctionRow
								key={auction.id}
								auction={auction}
								onCancel={() => setToCancel(auction)}
								onPublish={() => setToPublish(auction)}
							/>
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

			<Dialog open={toCancel !== null} onOpenChange={(open) => !open && !cancelling && setToCancel(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel this auction?</DialogTitle>
						<DialogDescription>
							&quot;{toCancel?.title}&quot; will be marked as cancelled. This can&apos;t be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setToCancel(null)} disabled={cancelling}>
							Keep draft
						</Button>
						<Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelling}>
							{cancelling ? <Loader2 className="animate-spin" /> : <XCircle />}
							Cancel auction
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<PublishAuctionDialog
				auction={toPublish}
				onClose={() => setToPublish(null)}
				onPublished={() => {
					setToPublish(null);
					reload();
				}}
			/>
		</div>
	);
}

function MyAuctionRow({
	auction,
	onCancel,
	onPublish,
}: {
	auction: AuctionSummary;
	onCancel: () => void;
	onPublish: () => void;
}) {
	const isDraft = auction.status === "DRAFT";
	const isActive = auction.status === "ACTIVE";

	return (
		<li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<Link
					href={`/auctions/${auction.id}`}
					className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 sm:block"
				>
					<AuctionThumb src={auction.primaryImageUrl} alt={auction.title} />
				</Link>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<StatusBadge status={auction.status} />
						<Link
							href={`/auctions/${auction.id}`}
							className="truncate font-semibold text-slate-900 hover:text-blue-600"
						>
							{auction.title}
						</Link>
					</div>

					<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
						<span>
							<span className="text-slate-400">Current </span>
							<span className="font-semibold text-blue-600">{formatCurrency(auction.currentPrice)}</span>
						</span>
						<span className="flex items-center gap-1">
							<TrendingUp className="h-4 w-4" />
							{auction.totalBids} {auction.totalBids === 1 ? "bid" : "bids"}
						</span>
						<span className="flex items-center gap-1">
							<Clock className="h-4 w-4" />
							{isActive ? timeRemaining(auction.endTime) : `Ends ${formatDateTime(auction.endTime)}`}
						</span>
					</div>
				</div>

				<div className="flex shrink-0 gap-2">
					<Link href={`/auctions/${auction.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
						<Eye />
						View
					</Link>
					{isDraft && (
						<>
							<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onPublish}>
								<Rocket />
								Publish
							</Button>
							<Link
								href={`/auctions/${auction.id}/edit`}
								className={buttonVariants({ variant: "outline", size: "sm" })}
							>
								<Pencil />
								Edit
							</Link>
							<Button variant="destructive" size="sm" onClick={onCancel}>
								<XCircle />
								Cancel
							</Button>
						</>
					)}
				</div>
			</div>
		</li>
	);
}
