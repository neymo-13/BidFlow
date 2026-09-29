"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Gavel, Search, X } from "lucide-react";

import { AuctionCard } from "@/components/auction/auction-card";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auctionApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { AuctionSort } from "@/lib/types";

// Live / Ended only (design DS-4) — the API never lists drafts or cancelled auctions
const STATUS_OPTIONS = [
	{ value: "ACTIVE", label: "Live", empty: "No live auctions right now" },
	{ value: "ENDED", label: "Ended", empty: "No ended auctions yet" },
] as const;

type ListStatus = (typeof STATUS_OPTIONS)[number]["value"];

const SORT_OPTIONS: ReadonlyArray<{ value: AuctionSort; label: string }> = [
	{ value: "newest", label: "Newest" },
	{ value: "endingSoon", label: "Ending soon" },
	{ value: "priceAsc", label: "Price: low to high" },
	{ value: "priceDesc", label: "Price: high to low" },
	{ value: "mostBids", label: "Most bids" },
];

const DEFAULT_SORT: AuctionSort = "newest";
const PAGE_SIZE = 12;
const QUERY_MAX = 100; // same limit as the API
const SEARCH_DEBOUNCE_MS = 400;

type QueryUpdate = { status?: ListStatus; page?: number; q?: string; sort?: AuctionSort };

export default function AuctionsPage() {
	// useSearchParams needs a Suspense boundary for production builds
	return (
		<Suspense
			fallback={
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<AuctionGridSkeleton />
				</div>
			}
		>
			<AuctionsContent />
		</Suspense>
	);
}

function AuctionsContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const status = parseStatus(searchParams.get("status"));
	const page = parsePage(searchParams.get("page"));
	const q = parseQuery(searchParams.get("q"));
	const sort = parseSort(searchParams.get("sort"));
	const statusOption = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];

	const { data, error, isLoading, reload } = useFetch(
		() => auctionApi.list(status, page, PAGE_SIZE, { q: q || undefined, sort }),
		[status, page, q, sort]
	);

	// Keep filters in the URL so refresh / shared links keep the same view.
	// Reads the live URL (not the render-time searchParams) because the debounced
	// search can fire after another filter has already changed.
	const updateQuery = (next: QueryUpdate, mode: "push" | "replace" = "push") => {
		const params = new URLSearchParams(window.location.search);
		const filterChanged = next.status !== undefined || next.q !== undefined || next.sort !== undefined;
		if (next.status) params.set("status", next.status);
		if (next.q !== undefined) {
			if (next.q) params.set("q", next.q);
			else params.delete("q");
		}
		if (next.sort !== undefined) {
			if (next.sort !== DEFAULT_SORT) params.set("sort", next.sort);
			else params.delete("sort");
		}
		if (filterChanged) params.delete("page");
		if (next.page !== undefined) {
			if (next.page > 0) params.set("page", String(next.page));
			else params.delete("page");
		}
		const query = params.toString();
		const url = query ? `${pathname}?${query}` : pathname;
		if (mode === "replace") router.replace(url);
		else router.push(url);
	};

	const handlePageChange = (next: number) => {
		updateQuery({ page: next });
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
						Browse auctions
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						{data && !isLoading
							? `${data.totalElements} ${data.totalElements === 1 ? "auction" : "auctions"}`
							: "Find something to bid on"}
					</p>
				</div>

				<Tabs value={status} onValueChange={(value) => updateQuery({ status: parseStatus(String(value)) })}>
					<TabsList>
						{STATUS_OPTIONS.map((option) => (
							<TabsTrigger key={option.value} value={option.value} className="px-4">
								{option.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</div>

			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
				{/* Typing updates the URL with replace so each keystroke doesn't add a history entry */}
				<SearchBox value={q} onSearch={(next) => updateQuery({ q: next }, "replace")} />
				<div className="flex items-center gap-2">
					<label htmlFor="auction-sort" className="shrink-0 text-sm text-slate-500">
						Sort by
					</label>
					<select
						id="auction-sort"
						value={sort}
						onChange={(e) => updateQuery({ sort: parseSort(e.target.value) })}
						className="h-9 rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						{SORT_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
			</div>

			{error && !isLoading ? (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
					<AlertCircle className="h-8 w-8 text-red-500" />
					<p className="text-sm text-red-700">{error}</p>
					<Button variant="outline" size="sm" onClick={reload}>
						Retry
					</Button>
				</div>
			) : isLoading && !data ? (
				<AuctionGridSkeleton />
			) : !data || data.content.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
						<Gavel className="h-7 w-7 text-slate-400" />
					</div>
					<h2 className="font-semibold text-slate-900">
						{q ? `No auctions match "${q}"` : statusOption.empty}
					</h2>
					{q ? (
						<Button variant="outline" size="sm" className="mt-4" onClick={() => updateQuery({ q: "" })}>
							Clear search
						</Button>
					) : page > 0 ? (
						<Button variant="outline" size="sm" className="mt-4" onClick={() => updateQuery({ page: 0 })}>
							Back to first page
						</Button>
					) : (
						<p className="mt-1 text-sm text-slate-500">Check back soon for new listings.</p>
					)}
				</div>
			) : (
				<div className="space-y-8">
					<div
						className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isLoading ? "opacity-60" : ""}`}
					>
						{data.content.map((auction) => (
							<AuctionCard key={auction.id} auction={auction} />
						))}
					</div>

					<Pagination
						page={data.number}
						totalPages={data.totalPages}
						onPageChange={handlePageChange}
						disabled={isLoading}
					/>
				</div>
			)}
		</div>
	);
}

// Search input with a debounce; Enter / the clear button search immediately
function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
	const [text, setText] = useState(value);
	const [submitted, setSubmitted] = useState(value);
	const [prevValue, setPrevValue] = useState(value);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// The URL changed from outside (back button, a link): show the new query.
	// Our own searches are skipped so text typed while the URL updates isn't overwritten.
	if (value !== prevValue) {
		setPrevValue(value);
		if (value !== submitted) {
			setText(value);
			setSubmitted(value);
		}
	}

	useEffect(() => {
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);

	const submit = (next: string) => {
		if (timer.current) clearTimeout(timer.current);
		const trimmed = next.trim();
		setSubmitted(trimmed);
		onSearch(trimmed);
	};

	const handleChange = (next: string) => {
		setText(next);
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => submit(next), SEARCH_DEBOUNCE_MS);
	};

	return (
		<form
			role="search"
			className="relative flex-1"
			onSubmit={(e) => {
				e.preventDefault();
				submit(text);
			}}
		>
			<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
			<Input
				type="search"
				value={text}
				maxLength={QUERY_MAX}
				onChange={(e) => handleChange(e.target.value)}
				placeholder="Search by title or description"
				aria-label="Search auctions"
				className="h-9 bg-white pr-9 pl-9"
			/>
			{text && (
				<button
					type="button"
					onClick={() => {
						setText("");
						submit("");
					}}
					className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
					aria-label="Clear search"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</form>
	);
}

function AuctionGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{[...Array(8)].map((_, i) => (
				<div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
			))}
		</div>
	);
}

// Invalid values in the URL fall back to defaults
function parseStatus(value: string | null): ListStatus {
	return STATUS_OPTIONS.some((o) => o.value === value) ? (value as ListStatus) : "ACTIVE";
}

function parsePage(value: string | null): number {
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : 0;
}

function parseQuery(value: string | null): string {
	return (value ?? "").trim().slice(0, QUERY_MAX);
}

function parseSort(value: string | null): AuctionSort {
	return SORT_OPTIONS.find((o) => o.value === value)?.value ?? DEFAULT_SORT;
}
