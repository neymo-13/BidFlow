"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { RequireAuth } from "@/components/auth/auth-guard";
import { AuctionForm } from "@/components/auction/auction-form";
import { ImagePicker, PendingImage } from "@/components/auction/image-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auctionApi } from "@/lib/api";
import { AuctionFormPayload, AuctionFormValues } from "@/lib/auction-form";
import { isoToLocalInput } from "@/lib/format";
import { getErrorMessage } from "@/lib/http";
import { CreateAuctionRequest } from "@/lib/types";

export default function CreateAuctionPage() {
	return (
		<RequireAuth>
			<CreateAuctionContent />
		</RequireAuth>
	);
}

function CreateAuctionContent() {
	const router = useRouter();
	const [initialValues] = useState(defaultValues);
	const [images, setImages] = useState<PendingImage[]>([]);
	const [uploadingImages, setUploadingImages] = useState(false);

	const handleSubmit = async (payload: AuctionFormPayload) => {
		// Create mode always sends every field. If this throws, the form shows the error.
		const created = await auctionApi.create(payload as CreateAuctionRequest);

		// Photos need the auction id, so they go up after it exists — one at a time to keep the order
		setUploadingImages(true);
		const failures: string[] = [];
		for (const image of images) {
			try {
				await auctionApi.uploadImage(created.id, image.file);
			} catch (e) {
				failures.push(`${image.file.name}: ${getErrorMessage(e)}`);
			}
		}

		if (failures.length > 0) {
			// The draft exists already — send the seller to Edit to retry the photos
			toast.warning(`"${created.title}" saved, but ${failures.length} photo(s) failed to upload`, {
				description: failures.join("\n"),
			});
			router.push(`/auctions/${created.id}/edit`);
			return;
		}

		toast.success(`"${created.title}" saved as a draft`);
		router.push("/auctions/my");
	};

	return (
		<div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl font-bold">Sell an item</CardTitle>
					<CardDescription>Fill in the details below to create a new auction.</CardDescription>
				</CardHeader>
				<CardContent>
					<AuctionForm
						mode="create"
						initialValues={initialValues}
						submitLabel="Create auction"
						onSubmit={handleSubmit}
						onCancel={() => router.back()}
						footerNote={
							<div className="space-y-5">
								<ImagePicker images={images} onChange={setImages} disabled={uploadingImages} />
								<div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
									<Info className="mt-0.5 h-4 w-4 shrink-0" />
									<span>
										Auctions are saved as <strong>Draft</strong>. Check the details, then publish from
										My Auctions when you&apos;re ready — drafts can still be edited or cancelled.
									</span>
								</div>
							</div>
						}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

// Start in 5 minutes (gives time to fill the form), run for 7 days
function defaultValues(): AuctionFormValues {
	const start = new Date(Date.now() + 5 * 60 * 1000);
	start.setSeconds(0, 0);
	const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

	return {
		title: "",
		categoryId: "",
		description: "",
		startPrice: "",
		minIncrement: "",
		startTime: isoToLocalInput(start),
		endTime: isoToLocalInput(end),
	};
}
