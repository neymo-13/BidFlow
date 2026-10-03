"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Ban, Gavel, Search, X } from "lucide-react";

import { CancelAuctionDialog } from "@/components/admin/cancel-auction-dialog";
import { AuctionThumb, StatusBadge } from "@/components/auction/auction-card";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api";
import { formatCurrency, formatDateTime, isUpcoming } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { AuctionStatus, AuctionSummary } from "@/lib/types";

// Admins see every status, including other people's drafts and cancelled auctions
const STATUS_OPTIONS = [
	{ value: "ALL", label: "All" },
	{ value: "ACTIVE", label: "Live" },
	{ value: "DRAFT", label: "Draft" },
	{ value: "ENDED", label: "Ended" },
	{ value: "CANCELLED", label: "Cancelled" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

const PAGE_SIZE = 20;
const QUERY_MAX = 100; // same limit as the API
const CANCELLABLE: ReadonlyArray<AuctionStatus> = ["DRAFT", "ACTIVE"];

type QueryUpdate = { status?: StatusFilter; q?: string; page?: number };

export default function AdminAuctionsPage() {
	// useSearchParams needs a Suspense boundary for production builds
	return (
		<Suspense fallback={<TableSkeleton />}>
			<AdminAuctionsContent />
		</Suspense>
	);
}

function AdminAuctionsContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [cancelling, setCancelling] = useState<AuctionSummary | null>(null);

	const status = parseStatus(searchParams.get("status"));
	const q = (searchParams.get("q") ?? "").trim().slice(0, QUERY_MAX);
	const page = parsePage(searchParams.get("page"));

	const { data, error, isLoading, reload } = useFetch(
		() => adminApi.listAuctions({ status: status === "ALL" ? undefined : status, q: q || undefined }, page, PAGE_SIZE),
		[status, q, page]
	);

	// Filters live in the URL (the dashboard links to ?status=…); a new filter goes back to page 1
	const updateQuery = (next: QueryUpdate) => {
		const params = new URLSearchParams(searchParams.toString());
		if (next.status !== undefined) {
			if (next.status === "ALL") params.delete("status");
			else params.set("status", next.status);
		}
		if (next.q !== undefined) {
			if (next.q) params.set("q", next.q);
			else params.delete("q");
		}
		if (next.status !== undefined || next.q !== undefined) params.delete("page");
		if (next.page !== undefined) {
			if (next.page > 0) params.set("page", String(next.page));
			else params.delete("page");
		}
		const query = params.toString();
		router.push(query ? `${pathname}?${query}` : pathname);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<Tabs value={status} onValueChange={(value) => updateQuery({ status: parseStatus(String(value)) })}>
					<TabsList>
						{STATUS_OPTIONS.map((option) => (
							<TabsTrigger key={option.value} value={option.value} className="px-3">
								{option.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				{/* key: the box shows the URL's query again after back / forward */}
				<SearchForm key={q} value={q} onSearch={(next) => updateQuery({ q: next })} />
			</div>

			<Card>
				<CardContent className="pt-6">
					{error && !isLoading ? (
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<AlertCircle className="h-8 w-8 text-red-500" />
							<p className="text-sm text-red-600">{error}</p>
							<Button variant="outline" size="sm" onClick={reload}>
								Retry
							</Button>
						</div>
					) : !data ? (
						<TableSkeleton />
					) : data.content.length === 0 ? (
						<div className="flex flex-col items-center gap-2 py-12 text-center">
							<Gavel className="h-8 w-8 text-slate-300" />
							<p className="font-medium text-slate-900">
								{q ? `No auctions match "${q}"` : "No auctions with this status"}
							</p>
							{q && (
								<Button variant="outline" size="sm" className="mt-2" onClick={() => updateQuery({ q: "" })}>
									Clear search
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-6">
							<p className="text-sm text-slate-500">
								{data.totalElements} {data.totalElements === 1 ? "auction" : "auctions"} · newest first
							</p>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Auction</TableHead>
										<TableHead className="hidden lg:table-cell">Category</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Price</TableHead>
										<TableHead className="hidden text-right sm:table-cell">Bids</TableHead>
										<TableHead className="hidden md:table-cell">Ends</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className={isLoading ? "opacity-60" : undefined}>
									{data.content.map((auction) => (
										<AuctionRow key={auction.id} auction={auction} onCancel={() => setCancelling(auction)} />
									))}
								</TableBody>
							</Table>
							<Pagination
								page={data.number}
								totalPages={data.totalPages}
								onPageChange={(next) => updateQuery({ page: next })}
								disabled={isLoading}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			<CancelAuctionDialog
				auction={cancelling}
				onClose={() => setCancelling(null)}
				onCancelled={() => {
					setCancelling(null);
					reload();
				}}
			/>
		</div>
	);
}

function AuctionRow({ auction, onCancel }: { auction: AuctionSummary; onCancel: () => void }) {
	// Drafts / cancelled auctions have no public page (the API answers 404 to everyone but the seller)
	const hasPublicPage = auction.status === "ACTIVE" || auction.status === "ENDED";
	const upcoming = auction.status === "ACTIVE" && isUpcoming(auction.startTime);

	return (
		<TableRow>
			<TableCell>
				<div className="flex items-center gap-3">
					<div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
						<AuctionThumb src={auction.primaryImageUrl} alt={auction.title} />
					</div>
					<div className="min-w-0">
						{hasPublicPage ? (
							<Link
								href={`/auctions/${auction.id}`}
								className="line-clamp-1 font-medium text-slate-900 hover:text-blue-600"
							>
								{auction.title}
							</Link>
						) : (
							<p className="line-clamp-1 font-medium text-slate-900">{auction.title}</p>
						)}
						<p className="text-xs text-slate-500">
							@{auction.sellerUsername}
							<span className="lg:hidden"> · {auction.category.name}</span>
						</p>
					</div>
				</div>
			</TableCell>
			<TableCell className="hidden text-slate-600 lg:table-cell">{auction.category.name}</TableCell>
			<TableCell>
				<StatusBadge status={upcoming ? "UPCOMING" : auction.status} />
			</TableCell>
			<TableCell className="text-right font-medium">{formatCurrency(auction.currentPrice)}</TableCell>
			<TableCell className="hidden text-right sm:table-cell">{auction.totalBids}</TableCell>
			<TableCell className="hidden text-slate-600 md:table-cell">{formatDateTime(auction.endTime)}</TableCell>
			<TableCell className="text-right">
				{CANCELLABLE.includes(auction.status) && (
					<Button
						variant="outline"
						size="sm"
						className="text-red-600 hover:bg-red-50 hover:text-red-700"
						onClick={onCancel}
					>
						<Ban />
						Cancel
					</Button>
				)}
			</TableCell>
		</TableRow>
	);
}

// Search runs on Enter / the Search button
function SearchForm({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
	const [text, setText] = useState(value);

	return (
		<form
			role="search"
			className="flex gap-2 lg:w-96"
			onSubmit={(e) => {
				e.preventDefault();
				onSearch(text.trim());
			}}
		>
			<div className="relative flex-1">
				<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					type="search"
					value={text}
					maxLength={QUERY_MAX}
					onChange={(e) => setText(e.target.value)}
					placeholder="Search by title or description"
					aria-label="Search auctions"
					className="h-9 bg-white pr-9 pl-9"
				/>
				{text && (
					<button
						type="button"
						onClick={() => {
							setText("");
							onSearch("");
						}}
						className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						aria-label="Clear search"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
			<Button type="submit" variant="outline" className="h-9">
				Search
			</Button>
		</form>
	);
}

function TableSkeleton() {
	return (
		<div className="space-y-2">
			{[...Array(6)].map((_, i) => (
				<Skeleton key={i} className="h-14" />
			))}
		</div>
	);
}

// Invalid values in the URL fall back to defaults
function parseStatus(value: string | null): StatusFilter {
	return STATUS_OPTIONS.find((o) => o.value === value)?.value ?? "ALL";
}

function parsePage(value: string | null): number {
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : 0;
}
