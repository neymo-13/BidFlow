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
import { Separator } from "@/components/ui/separator";
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
			{/* Breadcrumb */}
			<nav className="text-sm text-gray-500 mb-4">
				<Link href="/" className="hover:text-blue-600">
					Auctions
				</Link>
				<span className="mx-2">/</span>
				<span className="text-gray-900">{auction.title}</span>
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

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
				{/* Left: Image + Description */}
				<div className="lg:col-span-3">
					<Card className="overflow-hidden">
						<div className="aspect-4/3 bg-gray-100">
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

					<Card className="mt-6">
						<CardHeader>
							<CardTitle>Description</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-gray-700 whitespace-pre-wrap">
								{auction.description || "No description provided"}
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Right: Info + Bid */}
				<div className="lg:col-span-2 space-y-4">
					{/* Title + Status */}
					<div>
						<Link
							href={`/auctions?category=${encodeURIComponent(auction.category.slug)}`}
							className={cn(badgeVariants({ variant: "outline" }), "mb-2")}
						>
							{auction.category.name}
						</Link>
						<div className="flex items-start justify-between gap-2 mb-2">
							<h1 className="text-2xl font-bold">{auction.title}</h1>
							{isActive && (
								<Badge className="bg-green-500 text-white shrink-0">
									● LIVE
								</Badge>
							)}
							{isUpcomingActive && (
								<Badge className="bg-blue-500 text-white shrink-0">UPCOMING</Badge>
							)}
							{isEnded && (
								<Badge className="bg-gray-700 text-white shrink-0">ENDED</Badge>
							)}
						</div>

						<div className="flex items-center gap-2 text-sm text-gray-600">
							<UserIcon className="w-4 h-4" />
							<span>Seller: @{auction.sellerUsername}</span>
						</div>
					</div>

					<Separator />

					{/* Current Price */}
					<Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
						<CardContent className="pt-6">
							<p className="text-sm text-gray-600 mb-1">
								{isEnded ? "Winning bid" : "Current bid"}
							</p>
							<p className="text-4xl font-bold text-blue-600 mb-2">
								{formatCurrency(auction.currentPrice)}
							</p>

							<div className="flex items-center gap-4 text-sm text-gray-600">
								<span className="flex items-center gap-1">
									<TrendingUp className="w-4 h-4" />
									{auction.totalBids} bids
								</span>
								{isActive && (
									<span className="flex items-center gap-1 text-orange-600 font-medium">
										<Clock className="w-4 h-4" />
										{timeRemaining(auction.endTime)}
									</span>
								)}
								{isUpcomingActive && (
									<span className="flex items-center gap-1 text-blue-600 font-medium">
										<CalendarClock className="w-4 h-4" />
										{timeUntilStart(auction.startTime)}
									</span>
								)}
							</div>

							{isEnded && auction.winnerUsername && (
								<div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
									<p className="flex items-center gap-2 text-sm font-medium text-yellow-800">
										<Trophy className="w-4 h-4" />
										Winner: @{auction.winnerUsername}
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Your status */}
					{user && isActive && bids.length > 0 && (
						<>
							{bids[0].bidderUsername === user.username ? (
								<div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
									<p className="text-green-700 font-medium">
										You&apos;re winning!
									</p>
								</div>
							) : bids.some((b) => b.bidderUsername === user.username) ? (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
									<p className="text-red-700 font-medium">
										You&apos;ve been outbid!
									</p>
								</div>
							) : null}
						</>
					)}

					{/* Not open yet: no bid form until startTime (refresh once it has started) */}
					{isUpcomingActive && (
						<Card>
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

					{/* Bid Form */}
					{isActive && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Place Your Bid</CardTitle>
								<p className="text-sm text-gray-500">
									Minimum: {formatCurrency(minBid)}
								</p>
							</CardHeader>
							<CardContent className="space-y-3">
								{!user ? (
									<Button
										className="w-full"
										onClick={() =>
											router.push(`/login?redirect=/auctions/${auctionId}`)
										}
									>
										Sign in to Bid
									</Button>
								) : isSeller ? (
									<div className="p-3 bg-gray-50 rounded text-center text-sm text-gray-600">
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
													onClick={() => setBidAmount(String(amount))}
												>
													{formatCurrency(amount)}
												</Button>
											))}
										</div>

										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
												฿
											</span>
											<Input
												type="number"
												placeholder={String(minBid)}
												value={bidAmount}
												onChange={(e) => setBidAmount(e.target.value)}
												min={minBid}
												className="pl-7"
											/>
										</div>

										{bidError && (
											<div className="p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
												{bidError}
											</div>
										)}

										{bidSuccess && (
											<div className="p-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded">
												Bid placed successfully!
											</div>
										)}

										<Button
											className="w-full bg-blue-600 hover:bg-blue-700"
											onClick={handlePlaceBid}
											disabled={bidLoading || !bidAmount}
										>
											{bidLoading ? (
												<>
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													Placing bid...
												</>
											) : (
												`Place Bid — ${bidAmount ? formatCurrency(Number(bidAmount)) : formatCurrency(minBid)}`
											)}
										</Button>

										<p className="text-xs text-gray-500 text-center">
											Your balance: {formatCurrency(user.walletBalance || 0)}
										</p>
									</>
								)}
							</CardContent>
						</Card>
					)}

					{/* Bid History */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base flex items-center justify-between">
								<span>Bid History ({bids.length})</span>
								<span
									className={`flex items-center gap-1 text-xs font-normal ${isConnected ? "text-green-600" : "text-gray-400"
										}`}
								>
									{isConnected ? (
										<>
											<Wifi className="w-3 h-3" />
											Live
										</>
									) : (
										<>
											<WifiOff className="w-3 h-3" />
											Offline
										</>
									)}
								</span>
							</CardTitle>
						</CardHeader>
						<CardContent>
							{bids.length === 0 ? (
								<p className="text-sm text-gray-500 text-center py-4">
									No bids yet — be the first!
								</p>
							) : (
								<div className="space-y-2 max-h-80 overflow-y-auto">
									{bids.map((bid, i) => (
										<div
											key={bid.id}
											className={`flex items-center justify-between p-2 rounded ${i === 0 ? "bg-blue-50 border border-blue-200" : ""
												} ${bid.bidderUsername === user?.username
													? "font-medium"
													: ""
												}`}
										>
											<div className="flex items-center gap-2">
												<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
													{bid.bidderUsername[0].toUpperCase()}
												</div>
												<div>
													<p className="text-sm">
														@{bid.bidderUsername}
														{bid.bidderUsername === user?.username && (
															<span className="text-blue-600 text-xs ml-1">
																(you)
															</span>
														)}
													</p>
													<p className="text-xs text-gray-500">
														{formatDateTime(bid.createdAt)}
													</p>
												</div>
											</div>
											<p className="text-sm font-semibold">
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