"use client";

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react";

import { auctionApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/http";
import { IMAGE_ACCEPT, IMAGE_MAX_COUNT, pickImageFiles } from "@/lib/image-file";
import type { AuctionImage } from "@/lib/types";
import { cn } from "@/lib/utils";

// =====================================================
// Create page: files are kept in the browser and uploaded after the auction exists
// =====================================================
export interface PendingImage {
	key: string;
	file: File;
	previewUrl: string; // object URL — revoked when removed / unmounted
}

export function ImagePicker({
	images,
	onChange,
	disabled,
}: {
	images: PendingImage[];
	onChange: (next: PendingImage[]) => void;
	disabled?: boolean;
}) {
	const [errors, setErrors] = useState<string[]>([]);

	// Free the preview URLs when the page goes away
	const latest = useRef(images);
	useEffect(() => {
		latest.current = images;
	});
	useEffect(() => {
		return () => latest.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
	}, []);

	const handleFiles = (files: File[]) => {
		const { accepted, errors: problems } = pickImageFiles(images.length, files);
		setErrors(problems);
		if (accepted.length === 0) return;
		onChange([
			...images,
			...accepted.map((file) => ({ key: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) })),
		]);
	};

	const handleRemove = (image: PendingImage) => {
		URL.revokeObjectURL(image.previewUrl);
		setErrors([]);
		onChange(images.filter((i) => i.key !== image.key));
	};

	return (
		<PhotosSection errors={errors}>
			{images.map((image, index) => (
				<Thumb
					key={image.key}
					src={image.previewUrl}
					alt={image.file.name}
					isCover={index === 0}
					onRemove={() => handleRemove(image)}
					disabled={disabled}
				/>
			))}
			{images.length < IMAGE_MAX_COUNT && <AddTile onFiles={handleFiles} disabled={disabled} />}
		</PhotosSection>
	);
}

// =====================================================
// Edit page: uploads / deletes go to the API right away
// =====================================================
export function AuctionImageManager({
	auctionId,
	images,
	onChanged,
}: {
	auctionId: number;
	images: AuctionImage[];
	onChanged: () => void;
}) {
	const [uploading, setUploading] = useState(0);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [errors, setErrors] = useState<string[]>([]);
	const busy = uploading > 0 || deletingId !== null;

	const handleFiles = async (files: File[]) => {
		const { accepted, errors: problems } = pickImageFiles(images.length, files);
		const failures = [...problems];
		let uploaded = 0;

		setErrors([]);
		setUploading(accepted.length);
		// One at a time: the API keeps the order and the 5-image limit per request
		for (const file of accepted) {
			try {
				await auctionApi.uploadImage(auctionId, file);
				uploaded++;
			} catch (e) {
				failures.push(`${file.name}: ${getErrorMessage(e)}`);
			}
			setUploading((n) => n - 1);
		}

		setErrors(failures);
		if (uploaded > 0) {
			toast.success(`${uploaded} ${uploaded === 1 ? "photo" : "photos"} uploaded`);
			onChanged();
		}
	};

	const handleDelete = async (image: AuctionImage) => {
		setDeletingId(image.id);
		setErrors([]);
		try {
			await auctionApi.deleteImage(auctionId, image.id);
			toast.success("Photo removed");
			onChanged();
		} catch (e) {
			toast.error(getErrorMessage(e));
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<PhotosSection errors={errors}>
			{images.map((image) => (
				<Thumb
					key={image.id}
					src={image.url}
					alt="Auction photo"
					isCover={image.isPrimary}
					onRemove={() => handleDelete(image)}
					disabled={busy}
					removing={deletingId === image.id}
				/>
			))}
			{uploading > 0 && (
				<div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
					<Loader2 className="h-5 w-5 animate-spin text-blue-600" />
				</div>
			)}
			{images.length + uploading < IMAGE_MAX_COUNT && <AddTile onFiles={handleFiles} disabled={busy} />}
		</PhotosSection>
	);
}

// =====================================================
// Shared pieces
// =====================================================
function PhotosSection({ errors, children }: { errors: string[]; children: ReactNode }) {
	return (
		<div className="space-y-2">
			<div>
				<p className="text-sm font-medium text-slate-900">Photos</p>
				<p className="text-xs text-slate-500">
					Up to {IMAGE_MAX_COUNT} · JPG, PNG or WebP · 5 MB each · the first photo is the cover
				</p>
			</div>
			<div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{children}</div>
			{errors.length > 0 && (
				<ul className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{errors.map((error, i) => (
						<li key={i} className="flex items-start gap-2">
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
							<span className="break-all">{error}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function Thumb({
	src,
	alt,
	isCover,
	onRemove,
	disabled,
	removing,
}: {
	src: string;
	alt: string;
	isCover: boolean;
	onRemove: () => void;
	disabled?: boolean;
	removing?: boolean;
}) {
	return (
		<div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
			<img src={src} alt={alt} className={cn("h-full w-full object-cover", removing && "opacity-40")} />
			{isCover && (
				<span className="absolute top-1.5 left-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
					Cover
				</span>
			)}
			<button
				type="button"
				onClick={onRemove}
				disabled={disabled}
				aria-label={`Remove ${alt}`}
				className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1 text-slate-700 shadow hover:bg-white hover:text-red-600 disabled:opacity-50"
			>
				{removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
			</button>
		</div>
	);
}

function AddTile({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		e.target.value = ""; // allow picking the same file again after removing it
		if (files.length > 0) onFiles(files);
	};

	return (
		<label
			className={cn(
				"flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600",
				disabled && "pointer-events-none opacity-50"
			)}
		>
			<ImagePlus className="h-5 w-5" />
			Add photo
			<input type="file" accept={IMAGE_ACCEPT} multiple className="sr-only" onChange={handleChange} disabled={disabled} />
		</label>
	);
}
