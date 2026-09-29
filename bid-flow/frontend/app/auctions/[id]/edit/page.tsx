"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, Rocket } from "lucide-react";

import { RequireAuth } from "@/components/auth/auth-guard";
import { AuctionForm } from "@/components/auction/auction-form";
import { AuctionImageManager } from "@/components/auction/image-manager";
import { PublishAuctionDialog } from "@/components/auction/publish-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auctionApi } from "@/lib/api";
import { AuctionFormPayload, AuctionFormValues } from "@/lib/auction-form";
import { isoToLocalInput } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import { useAuthStore } from "@/lib/store/auth-store";
import { Auction } from "@/lib/types";

export default function EditAuctionPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params);

	return (
		<RequireAuth>
			<EditAuctionContent auctionId={Number(id)} />
		</RequireAuth>
	);
}

function EditAuctionContent({ auctionId }: { auctionId: number }) {
	const router = useRouter();
	const user = useAuthStore((s) => s.user);
	const [publishOpen, setPublishOpen] = useState(false);

	const { data: auction, error, isLoading, reload } = useFetch(
		() => auctionApi.getById(auctionId),
		[auctionId]
	);

	const handleSubmit = async (payload: AuctionFormPayload) => {
		const updated = await auctionApi.update(auctionId, payload);
		toast.success(`"${updated.title}" was updated`);
		router.push("/auctions/my");
	};

	if (!Number.isInteger(auctionId) || auctionId <= 0) {
		return <Notice title="Auction not found" />;
	}

	if (isLoading && !auction) {
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (error || !auction) {
		return <Notice title={error ?? "Auction not found"} onRetry={reload} />;
	}

	// UX only — the backend checks ownership and status again
	if (auction.sellerUsername !== user?.username) {
		return <Notice title="You can't edit this auction" description="Only the seller can edit an auction." />;
	}

	if (auction.status !== "DRAFT") {
		return (
			<Notice
				title="Only draft auctions can be edited"
				description={`This auction is ${auction.status.toLowerCase()}.`}
			/>
		);
	}

	return (
		<div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl font-bold">Edit auction</CardTitle>
					<CardDescription>Only the fields you change will be saved.</CardDescription>
				</CardHeader>
				<CardContent>
					<AuctionForm
						key={auction.id}
						mode="edit"
						initialValues={toFormValues(auction)}
						submitLabel="Save changes"
						onSubmit={handleSubmit}
						onCancel={() => router.push("/auctions/my")}
					/>
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardContent className="pt-6">
					{/* Saved immediately (not part of "Save changes"); reload refreshes the image URLs */}
					<AuctionImageManager auctionId={auction.id} images={auction.images} onChanged={reload} />
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="font-medium text-slate-900">Ready to go live?</p>
						<p className="text-sm text-slate-500">
							Save your changes first — publishing uses the saved version.
						</p>
					</div>
					<Button className="shrink-0 bg-blue-600 hover:bg-blue-700" onClick={() => setPublishOpen(true)}>
						<Rocket />
						Publish
					</Button>
				</CardContent>
			</Card>

			<PublishAuctionDialog
				auction={publishOpen ? auction : null}
				onClose={() => setPublishOpen(false)}
				onPublished={(published) => router.push(`/auctions/${published.id}`)}
			/>
		</div>
	);
}

function Notice({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
	return (
		<div className="mx-auto max-w-md px-4 py-16">
			<Card>
				<CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
					<AlertCircle className="h-10 w-10 text-red-500" />
					<p className="font-medium text-slate-900">{title}</p>
					{description && <p className="text-sm text-slate-500">{description}</p>}
					<div className="mt-2 flex gap-2">
						{onRetry && (
							<Button variant="outline" size="sm" onClick={onRetry}>
								Retry
							</Button>
						)}
						<Link href="/auctions/my" className={buttonVariants({ size: "sm" })}>
							Back to My Auctions
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function toFormValues(auction: Auction): AuctionFormValues {
	return {
		title: auction.title,
		description: auction.description ?? "",
		startPrice: String(auction.startPrice),
		minIncrement: String(auction.minIncrement),
		startTime: isoToLocalInput(auction.startTime),
		endTime: isoToLocalInput(auction.endTime),
	};
}
