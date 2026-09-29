import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuctionSummary } from "@/lib/types";
import { formatCurrency, isUpcoming, timeRemaining, timeUntilStart } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CalendarClock, Clock, ImageOff, TrendingUp } from "lucide-react";

export function AuctionCard({ auction }: { auction: AuctionSummary }) {
	const isEnded = auction.status === "ENDED";
	// Published but bidding hasn't opened yet
	const isUpcomingActive = auction.status === "ACTIVE" && isUpcoming(auction.startTime);
	const isActive = auction.status === "ACTIVE" && !isUpcomingActive;

	return (
		<Link href={`/auctions/${auction.id}`}>
			<Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
				{/* Image */}
				<div className="relative aspect-4/3 overflow-hidden bg-gray-100">
					<AuctionThumb
						src={auction.primaryImageUrl}
						alt={auction.title}
						className="group-hover:scale-105 transition-transform duration-500"
					/>
					{/* Badge overlay */}
					<div className="absolute top-3 right-3">
						<StatusBadge status={isUpcomingActive ? "UPCOMING" : auction.status} />
					</div>
				</div>

				<CardHeader className="pb-3">
					<CardTitle className="text-lg line-clamp-2 min-h-[3.5rem]">
						{auction.title}
					</CardTitle>
					<p className="text-sm text-gray-500">by @{auction.sellerUsername}</p>
				</CardHeader>

				<CardContent className="space-y-3">
					<div>
						<p className="text-xs text-gray-500 mb-1">Current bid</p>
						<p className="text-2xl font-bold text-blue-600">
							{formatCurrency(auction.currentPrice)}
						</p>
					</div>

					<div className="flex items-center justify-between text-sm pt-2 border-t">
						<span className="flex items-center gap-1 text-gray-600">
							<TrendingUp className="w-4 h-4" />
							{auction.totalBids} {auction.totalBids === 1 ? "bid" : "bids"}
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
						{isEnded && (
							<span className="text-gray-500">Ended</span>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

// Auction photo, or a neutral placeholder when the seller hasn't added one.
// Plain <img>: URLs are short-lived presigned links from the object storage host.
export function AuctionThumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
	if (!src) {
		return (
			<div
				role="img"
				aria-label={`${alt} (no photo)`}
				className={cn("flex h-full w-full items-center justify-center bg-slate-100 text-slate-300", className)}
			>
				<ImageOff className="h-1/3 max-h-10 w-1/3 max-w-10" />
			</div>
		);
	}
	return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
}

export function StatusBadge({ status }: { status: string }) {
	const config: Record<
		string,
		{ label: string; className: string }
	> = {
		ACTIVE: {
			label: "● LIVE",
			className: "bg-green-500 hover:bg-green-600 text-white border-0",
		},
		ENDED: {
			label: "ENDED",
			className: "bg-gray-700 hover:bg-gray-800 text-white border-0",
		},
		// Not an API status: ACTIVE whose startTime is still in the future
		UPCOMING: {
			label: "UPCOMING",
			className: "bg-blue-500 text-white border-0",
		},
		DRAFT: {
			label: "DRAFT",
			className: "bg-gray-400 text-white border-0",
		},
		CANCELLED: {
			label: "CANCELLED",
			className: "bg-red-500 text-white border-0",
		},
	};

	const { label, className } = config[status] || {
		label: status,
		className: "",
	};

	return (
		<Badge className={`${className} shadow-md`}>
			{label}
		</Badge>
	);
}