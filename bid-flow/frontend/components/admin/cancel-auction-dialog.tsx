"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Ban, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/http";
import type { AuctionSummary } from "@/lib/types";

const REASON_MAX = 500; // same limit as the API

// Admin cancels a DRAFT / ACTIVE auction with a reason. Open it by passing an auction; null closes it.
export function CancelAuctionDialog({
	auction,
	onClose,
	onCancelled,
}: {
	auction: AuctionSummary | null;
	onClose: () => void;
	onCancelled: () => void;
}) {
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [cancelling, setCancelling] = useState(false);
	const [openedFor, setOpenedFor] = useState<number | null>(null);

	// Start with an empty reason each time the dialog opens for an auction
	if (auction && auction.id !== openedFor) {
		setOpenedFor(auction.id);
		setReason("");
		setError(null);
	}
	if (!auction && openedFor !== null) {
		setOpenedFor(null);
	}

	// currentPrice of an ACTIVE auction with bids is the leading bid, held from the leader's wallet
	const leadingBid = auction?.status === "ACTIVE" && auction.totalBids > 0 ? auction.currentPrice : null;

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!auction) return;
		const trimmed = reason.trim();
		if (!trimmed) {
			setError("Reason is required");
			return;
		}

		setCancelling(true);
		try {
			await adminApi.cancelAuction(auction.id, { reason: trimmed });
			toast.success(`"${auction.title}" was cancelled`);
			onCancelled();
		} catch (err) {
			// e.g. 409 while a bid is being processed, 400 if it has just ended
			setError(getErrorMessage(err));
		} finally {
			setCancelling(false);
		}
	};

	return (
		<Dialog open={auction !== null} onOpenChange={(open) => !open && !cancelling && onClose()}>
			<DialogContent>
				<form onSubmit={handleSubmit} noValidate className="space-y-4">
					<DialogHeader>
						<DialogTitle>Cancel this auction?</DialogTitle>
						<DialogDescription>
							&quot;{auction?.title}&quot; by @{auction?.sellerUsername} will be cancelled and hidden from
							everyone. This can&apos;t be undone.
						</DialogDescription>
					</DialogHeader>

					<p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>
							{leadingBid !== null
								? `The leading bid of ${formatCurrency(leadingBid, 2)} is returned to the bidder's wallet. The seller and everyone who bid get a notification with your reason.`
								: auction?.status === "ACTIVE"
									? "No one has bid yet. The seller gets a notification with your reason."
									: "This is a draft. The seller gets a notification with your reason."}
						</span>
					</p>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<Label htmlFor="cancel-reason">Reason</Label>
							<span className="text-xs text-slate-400">
								{reason.length}/{REASON_MAX}
							</span>
						</div>
						<Textarea
							id="cancel-reason"
							value={reason}
							onChange={(e) => {
								setReason(e.target.value);
								setError(null);
							}}
							maxLength={REASON_MAX}
							rows={3}
							placeholder="e.g. Listing breaks the rules: counterfeit item"
							aria-invalid={error ? true : undefined}
						/>
						{error && <p className="text-sm text-red-600">{error}</p>}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose} disabled={cancelling}>
							Keep auction
						</Button>
						<Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={cancelling}>
							{cancelling ? <Loader2 className="animate-spin" /> : <Ban />}
							Cancel auction
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
