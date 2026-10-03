"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Auction, BidEvent, BidSummary } from "@/lib/types";
import { auctionApi, bidApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatCurrency, formatDateTime, isUpcoming, timeRemaining, timeUntilStart } from "@/lib/format";
import { AuctionThumb } from "@/components/auction/auction-card";
import { PublishAuctionDialog } from "@/components/auction/publish-dialog";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import Odometer from "@/components/ui/odometer";
import { toast } from "sonner";
import { useAuctionWebSocket } from "@/lib/hooks/use-auction-websocket";
import {
	Clock,
	TrendingUp,
	User as UserIcon,
	Trophy,
	AlertCircle,
	CalendarClock,
	Loader2,
	Pencil,
	Rocket,
	Wifi,
	WifiOff,
} from "lucide-react";

export default function AuctionDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const auctionId = Number(id);
	const router = useRouter();
	const { user, refreshUser } = useAuthStore();

	// =====================================================
	// States
	// =====================================================
	const [auction, setAuction] = useState<Auction | null>(null);
	const [bids, setBids] = useState<BidSummary[]>([]);
	const [initialLoading, setInitialLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [bidAmount, setBidAmount] = useState("");
	const [bidLoading, setBidLoading] = useState(false);
	const [bidError, setBidError] = useState<string | null>(null);
	const [bidSuccess, setBidSuccess] = useState(false);
	const [publishOpen, setPublishOpen] = useState(false);
	const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

	// Another auction opened in the same page instance → show the loader again
	// (state adjusted during render instead of inside the effect)
	const [loadedId, setLoadedId] = useState(auctionId);
	if (loadedId !== auctionId) {
		setLoadedId(auctionId);
		setInitialLoading(true);
		setError(null);
	}

	// =====================================================
	// Load data — state is only set in the promise callbacks (after the request finishes).
	// isCurrent lets the caller drop a response that arrives after it moved on.
	// =====================================================
	const loadData = useCallback(
		(isCurrent: () => boolean = () => true) =>
			Promise.all([auctionApi.getById(auctionId), bidApi.getBids(auctionId, 0, 20)]).then(
				([auctionRes, bidsRes]) => {
					if (!isCurrent()) return;
					setAuction(auctionRes);
					setBids(bidsRes.content);
					setError(null);
					setInitialLoading(false);
				},
				(e) => {
					if (!isCurrent()) return;
					setError(getErrorMessage(e));
					setInitialLoading(false);
				}
			),
		[auctionId]
	);

	// =====================================================
	// Initial load
	// =====================================================
	useEffect(() => {
		let current = true;
		loadData(() => current);
		return () => {
			current = false;
		};
	}, [loadData]);

	// =====================================================
	// WebSocket
	// =====================================================
	const { isConnected } = useAuctionWebSocket(auctionId, (event: BidEvent) => {
		// Update price + count
		setAuction((prev) =>
			prev
				? {
					...prev,
					currentPrice: event.currentPrice,
					totalBids: prev.totalBids + 1,
				}
				: prev
		);

		if (event.type === "BID_PLACED") {
			// Add to bid list
			setBids((prev) => [
				{
					id: event.bidId,
					bidderUsername: event.bidderUsername,
					bidAmount: event.amount,
					bidSequence: event.sequence,
					createdAt: event.timestamp,
				},
				...prev,
			]);

			// Toast + refresh balance if not me
			if (user && event.bidderUsername !== user.username) {
				toast.info(
					`New bid: ${formatCurrency(event.amount)} by @${event.bidderUsername}`
				);
				refreshUser();
			}
		}

		if (event.type === "AUCTION_ENDED") {
			toast.success("Auction ended!", {
				description: `Winner: @${event.bidderUsername} — ${formatCurrency(event.amount)}`,
			});
			refreshUser();
			loadData(); // silent: the loader only shows before the first load
		}
	});

	// =====================================================
	// Place bid
	// =====================================================
	const minBid = auction ? auction.currentPrice + auction.minIncrement : 0;

	const handlePlaceBid = async () => {
		if (!user) {
			router.push(`/login?redirect=/auctions/${auctionId}`);
			return;
		}

		const amount = Number(bidAmount);
		if (!amount || amount < minBid) {
			setBidError(`Bid must be at least ${formatCurrency(minBid)}`);
			return;
		}

		setBidLoading(true);
		setBidError(null);
		setBidSuccess(false);

		try {
			await bidApi.placeBid(auctionId, amount);

			// WebSocket จะอัปเดต UI — แค่ refresh balance
			setBidSuccess(true);
			setBidAmount("");
			await refreshUser();

			setTimeout(() => setBidSuccess(false), 3000);
		} catch (e) {
			setBidError(getErrorMessage(e));
		} finally {
			setBidLoading(false);
		}
	};

	// =====================================================
	// Loading state (แค่ครั้งแรก)
	// =====================================================
	if (initialLoading) {
		return (
			<div className="container mx-auto px-4 py-12">
				<div className="flex items-center justify-center py-24">
					<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
				</div>
			</div>
		);
	}

	// =====================================================
	// Error state
	// =====================================================
	if (error || !auction) {
		return (
			<div className="container mx-auto px-4 py-12">
				<Card className="max-w-md mx-auto">
					<CardContent className="pt-6 text-center">
						<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
						<p className="text-red-600 mb-4">{error || "Auction not found"}</p>
						<Button onClick={() => router.push("/")}>Back to Home</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// =====================================================
	// Derived values
	// =====================================================
	// Published but bidding hasn't opened yet (the API rejects bids before startTime)
	const isUpcomingActive = auction.status === "ACTIVE" && isUpcoming(auction.startTime);
	const isActive = auction.status === "ACTIVE" && !isUpcomingActive;
	const isEnded = auction.status === "ENDED";
	const isDraft = auction.status === "DRAFT";
	const isCancelled = auction.status === "CANCELLED";
	const isSeller = user?.username === auction.sellerUsername;
	// Selection is kept by id, so it survives a reload (image URLs are re-signed each time)
	const images = auction.images ?? [];
	const selectedImage = images.find((image) => image.id === selectedImageId) ?? images[0] ?? null;

	const quickAmounts = [
		auction.currentPrice + auction.minIncrement,
		auction.currentPrice + auction.minIncrement * 2,
		auction.currentPrice + auction.minIncrement * 5,
		auction.currentPrice + auction.minIncrement * 10,
	];

	return (
		<div className="container mx-auto px-4 py-6">
			<nav className="mb-4 text-sm text-slate-500">
				<Link href="/" className="transition-colors hover:text-blue-600">
					Auctions
				</Link>
				<span className="mx-2">/</span>
				<span className="text-slate-900">{auction.title}</span>
			</nav>

			{/* Only the seller can open a draft / cancelled auction (the API returns 404 to others) */}
			{isSeller && (isDraft || isCancelled) && (
				<div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-amber-800">
						{isDraft
							? "This auction is a draft — only you can see it. Publish it to start taking bids."
							: "This auction was cancelled — only you can see it."}
					</p>
					{isDraft && (
						<div className="flex shrink-0 gap-2">
							<Link
								href={`/auctions/${auction.id}/edit`}
								className={buttonVariants({ variant: "outline", size: "sm" })}
							>
								<Pencil />
								Edit
							</Link>
							<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setPublishOpen(true)}>
								<Rocket />
								Publish
							</Button>
						</div>
					)}
				</div>
			)}

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
				<div className="lg:col-span-3">
					<Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md">
						<div className="aspect-4/3 bg-slate-100">
							<AuctionThumb src={selectedImage?.url ?? null} alt={auction.title} />
						</div>
						{images.length > 1 && (
							<div className="flex gap-2 overflow-x-auto px-3 pb-3">
								{images.map((image, i) => {
									const isSelected = image.id === selectedImage?.id;
									return (
										<button
											key={image.id}
											type="button"
											onClick={() => setSelectedImageId(image.id)}
											aria-label={`Show photo ${i + 1} of ${images.length}`}
											aria-pressed={isSelected}
											className={cn(
												"h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-opacity",
												isSelected ? "border-blue-600" : "border-transparent opacity-70 hover:opacity-100"
											)}
										>
											<AuctionThumb src={image.url} alt="" />
										</button>
									);
								})}
							</div>
						)}
					</Card>

					<Card className="mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-xl font-semibold text-slate-900">
								Description
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<p className="whitespace-pre-wrap leading-relaxed text-slate-600">
								{auction.description || "No description provided"}
							</p>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4 lg:col-span-2">
					<div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
						<Link
							href={`/auctions?category=${encodeURIComponent(auction.category.slug)}`}
							className={cn(badgeVariants({ variant: "outline" }), "mb-2")}
						>
							{auction.category.name}
						</Link>
						<div className="mb-2 flex items-start justify-between gap-3">
							<h1 className="text-2xl font-bold tracking-tight text-slate-900">
								{auction.title}
							</h1>
							{isActive && (
								<Badge className="shrink-0 border border-emerald-200 bg-emerald-50 text-emerald-700">
									● Live
								</Badge>
							)}
							{isUpcomingActive && (
								<Badge className="shrink-0 border border-blue-200 bg-blue-50 text-blue-700">
									Upcoming
								</Badge>
							)}
							{isEnded && (
								<Badge className="shrink-0 border border-slate-200 bg-slate-100 text-slate-700">
									Ended
								</Badge>
							)}
						</div>

						<div className="flex items-center gap-2 text-sm text-slate-600">
							<UserIcon className="h-4 w-4" />
							<span>Seller: @{auction.sellerUsername}</span>
						</div>
					</div>

					<Card className="border border-slate-200/80 bg-gradient-to-br from-slate-50 to-blue-50/40 shadow-sm">
						<CardContent className="space-y-4 p-6">
							<div className="flex items-center justify-between gap-3">
								<p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
									{isEnded ? "Winning bid" : "Current bid"}
								</p>
								{isActive && (
									<div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
										<TrendingUp className="h-3.5 w-3.5" />
										{auction.totalBids} bids
									</div>
								)}
							</div>

							<div className="flex items-center text-4xl font-extrabold tracking-tight text-blue-600">
								<span className="mr-1">฿</span>
								<Odometer value={auction.currentPrice} />
							</div>

							<div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
								{isUpcomingActive ? (
									<span className="inline-flex items-center gap-1.5 font-medium text-blue-600">
										<CalendarClock className="h-4 w-4" />
										{timeUntilStart(auction.startTime)}
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5">
										<Clock className="h-4 w-4 text-slate-500" />
										{isActive
											? timeRemaining(auction.endTime)
											: isDraft
												? "Not published yet"
												: "Auction closed"}
									</span>
								)}
								<span className="inline-flex items-center gap-1.5">
									<Trophy className="h-4 w-4 text-slate-500" />
									{auction.totalBids} total bids
								</span>
							</div>

							{isEnded && auction.winnerUsername && (
								<div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
									<p className="flex items-center gap-2 text-sm font-medium text-amber-800">
										<Trophy className="h-4 w-4" />
										Winner: @{auction.winnerUsername}
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{user && isActive && bids.length > 0 && (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
							{bids[0].bidderUsername === user.username ? (
								<p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
									<TrendingUp className="h-4 w-4" />
									You&apos;re winning!
								</p>
							) : bids.some((b) => b.bidderUsername === user.username) ? (
								<p className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700">
									<AlertCircle className="h-4 w-4" />
									You&apos;ve been outbid!
								</p>
							) : null}
						</div>
					)}

					{/* Not open yet: no bid form until startTime (refresh once it has started) */}
					{isUpcomingActive && (
						<Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
							<CardContent className="flex items-start gap-3 pt-6">
								<CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
								<div>
									<p className="font-medium text-slate-900">Bidding hasn&apos;t started yet</p>
									<p className="text-sm text-slate-500">
										Opens {formatDateTime(auction.startTime)} · closes {formatDateTime(auction.endTime)}
									</p>
								</div>
							</CardContent>
						</Card>
					)}

					{isActive && (
						<Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
							<CardHeader className="pb-3">
								<CardTitle className="text-base font-semibold text-slate-900">
									Place Your Bid
								</CardTitle>
								<p className="text-sm text-slate-500">Minimum: {formatCurrency(minBid)}</p>
							</CardHeader>
							<CardContent className="space-y-3 pt-0">
								{!user ? (
									<Button
										className="w-full bg-blue-600 text-white hover:bg-blue-700"
										onClick={() =>
											router.push(`/login?redirect=/auctions/${auctionId}`)
										}
									>
										Sign in to Bid
									</Button>
								) : isSeller ? (
									<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-sm text-slate-600">
										You can&apos;t bid on your own auction
									</div>
								) : (
									<>
										<div className="grid grid-cols-2 gap-2">
											{quickAmounts.map((amount, i) => (
												<Button
													key={i}
													variant="outline"
													size="sm"
													className="rounded-xl border-slate-200 bg-white font-semibold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
													onClick={() => setBidAmount(String(amount))}
												>
													{formatCurrency(amount)}
												</Button>
											))}
										</div>

										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
												฿
											</span>
											<Input
												type="number"
												placeholder={String(minBid)}
												value={bidAmount}
												onChange={(e) => setBidAmount(e.target.value)}
												min={minBid}
												className="rounded-xl border-slate-200 bg-slate-50 pl-7 text-slate-900 shadow-sm focus-visible:ring-blue-500"
											/>
										</div>

										{bidError && (
											<div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
												{bidError}
											</div>
										)}

										{bidSuccess && (
											<div className="rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-700">
												Bid placed successfully!
											</div>
										)}

										<Button
											className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98]"
											onClick={handlePlaceBid}
											disabled={bidLoading || !bidAmount}
										>
											{bidLoading ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Placing bid...
												</>
											) : (
												`Place Bid — ${bidAmount ? formatCurrency(Number(bidAmount)) : formatCurrency(minBid)}`
											)}
										</Button>

										<p className="text-center text-xs text-slate-500">
											Your balance: {formatCurrency(user.walletBalance || 0)}
										</p>
									</>
								)}
							</CardContent>
						</Card>
					)}

					<Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900">
								<span>Bid History ({bids.length})</span>
								<span
									className={`inline-flex items-center gap-1 text-xs font-medium ${isConnected ? "text-emerald-600" : "text-slate-400"}`}
								>
									{isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
									{isConnected ? "Live" : "Offline"}
								</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							{bids.length === 0 ? (
								<p className="py-4 text-center text-sm text-slate-500">
									No bids yet — be the first!
								</p>
							) : (
								<div className="max-h-[250px] space-y-0 divide-y divide-slate-100 overflow-y-auto pr-1">
									{bids.map((bid, i) => (
										<div
											key={bid.id}
											className={`flex items-center justify-between gap-3 p-3 ${bid.bidderUsername === user?.username
													? "bg-blue-50/50"
													: i % 2 === 0
														? "bg-slate-50/50"
														: "bg-white"
												}`}
										>
											<div className="flex items-center gap-2.5">
												<div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
													{bid.bidderUsername[0].toUpperCase()}
												</div>
												<div>
													<p className="text-sm font-medium text-slate-700">
														@{bid.bidderUsername}
														{bid.bidderUsername === user?.username && (
															<span className="ml-1 text-xs font-semibold text-blue-600">(you)</span>
														)}
													</p>
													<p className="text-xs text-slate-500">
														{formatDateTime(bid.createdAt)}
													</p>
												</div>
											</div>
											<p className="text-sm font-semibold text-slate-900">
												{formatCurrency(bid.bidAmount)}
											</p>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			<PublishAuctionDialog
				auction={publishOpen ? auction : null}
				onClose={() => setPublishOpen(false)}
				onPublished={() => {
					setPublishOpen(false);
					loadData();
				}}
			/>
		</div>
	);
}
