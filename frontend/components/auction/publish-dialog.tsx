"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { auctionApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/http";
import type { Auction, AuctionSummary } from "@/lib/types";

type PublishTarget = Pick<AuctionSummary, "id" | "title" | "startTime" | "endTime">;

// Confirm dialog for DRAFT → ACTIVE. Open it by passing an auction; null closes it.
export function PublishAuctionDialog({
	auction,
	onClose,
	onPublished,
}: {
	auction: PublishTarget | null;
	onClose: () => void;
	onPublished: (published: Auction) => void;
}) {
	const [publishing, setPublishing] = useState(false);

	// UX only — the backend rejects an end time in the past as well
	const endPassed = auction ? isPast(auction.endTime) : false;
	const startsNow = auction ? isPast(auction.startTime) : false;

	const handlePublish = async () => {
		if (!auction) return;
		setPublishing(true);
		try {
			const published = await auctionApi.publish(auction.id);
			toast.success(`"${published.title}" is now published`);
			onPublished(published);
		} catch (e) {
			toast.error(getErrorMessage(e));
		} finally {
			setPublishing(false);
		}
	};

	return (
		<Dialog open={auction !== null} onOpenChange={(open) => !open && !publishing && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Publish this auction?</DialogTitle>
					<DialogDescription>
						&quot;{auction?.title}&quot; will be visible to everyone. After publishing you can&apos;t edit or
						cancel it.
					</DialogDescription>
				</DialogHeader>

				{auction &&
					(endPassed ? (
						<p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							The end time ({formatDateTime(auction.endTime)}) has already passed. Edit the auction first.
						</p>
					) : (
						<p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
							{startsNow
								? "Bidding opens right away"
								: `Bidding opens ${formatDateTime(auction.startTime)}`}{" "}
							and closes {formatDateTime(auction.endTime)}.
						</p>
					))}

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={publishing}>
						Not yet
					</Button>
					<Button
						className="bg-blue-600 hover:bg-blue-700"
						onClick={handlePublish}
						disabled={publishing || endPassed}
					>
						{publishing ? <Loader2 className="animate-spin" /> : <Rocket />}
						Publish
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function isPast(iso: string): boolean {
	return new Date(iso).getTime() <= Date.now();
}
