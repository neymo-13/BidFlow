"use client";

import { ReactNode, useState } from "react";
import axios from "axios";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	AuctionFieldErrors,
	AuctionFieldName,
	AuctionFormPayload,
	AuctionFormValues,
	buildAuctionPayload,
	DESCRIPTION_MAX,
	TITLE_MAX,
	validateAuctionForm,
} from "@/lib/auction-form";
import { ApiError, getErrorMessage } from "@/lib/http";

interface AuctionFormProps {
	mode: "create" | "edit";
	initialValues: AuctionFormValues;
	submitLabel: string;
	onSubmit: (payload: AuctionFormPayload) => Promise<void>;
	onCancel?: () => void;
	footerNote?: ReactNode;
}

// Shared by the create and edit pages
export function AuctionForm({ mode, initialValues, submitLabel, onSubmit, onCancel, footerNote }: AuctionFormProps) {
	const [values, setValues] = useState<AuctionFormValues>(initialValues);
	const [fieldErrors, setFieldErrors] = useState<AuctionFieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const setField = (field: AuctionFieldName, value: string) => {
		setValues((prev) => ({ ...prev, [field]: value }));
		setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
	};

	// Edit mode sends only the fields the user changed
	const isChanged = (field: AuctionFieldName) => mode === "create" || values[field] !== initialValues[field];

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setFormError(null);

		const errors = validateAuctionForm(values, isChanged);
		setFieldErrors(errors);
		if (Object.keys(errors).length > 0) return;

		const payload = buildAuctionPayload(values, isChanged);
		if (Object.keys(payload).length === 0) {
			setFormError("Nothing to save — no fields were changed.");
			return;
		}

		setSubmitting(true);
		try {
			await onSubmit(payload);
		} catch (err) {
			// Map backend validation details onto matching fields
			if (axios.isAxiosError<ApiError>(err) && err.response?.data?.details) {
				const details = err.response.data.details;
				const mapped: AuctionFieldErrors = {};
				for (const key of Object.keys(details)) {
					if (key in values) mapped[key as AuctionFieldName] = details[key];
				}
				if (Object.keys(mapped).length > 0) setFieldErrors(mapped);
			}
			setFormError(getErrorMessage(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} noValidate className="space-y-5">
			{formError && (
				<div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>{formError}</span>
				</div>
			)}

			<Field id="title" label="Title" error={fieldErrors.title}>
				<Input
					id="title"
					value={values.title}
					onChange={(e) => setField("title", e.target.value)}
					maxLength={TITLE_MAX}
					placeholder="e.g. iPhone 15 Pro Max 256GB"
					aria-invalid={fieldErrors.title ? true : undefined}
					className="h-10"
				/>
			</Field>

			<Field
				id="description"
				label="Description"
				hint={`${values.description.length}/${DESCRIPTION_MAX}`}
				error={fieldErrors.description}
			>
				<Textarea
					id="description"
					value={values.description}
					onChange={(e) => setField("description", e.target.value)}
					maxLength={DESCRIPTION_MAX}
					rows={5}
					placeholder="Condition, what's included, shipping details..."
					aria-invalid={fieldErrors.description ? true : undefined}
				/>
			</Field>

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<Field id="startPrice" label="Start price (THB)" error={fieldErrors.startPrice}>
					<Input
						id="startPrice"
						inputMode="decimal"
						value={values.startPrice}
						onChange={(e) => setField("startPrice", e.target.value)}
						placeholder="1000"
						aria-invalid={fieldErrors.startPrice ? true : undefined}
						className="h-10"
					/>
				</Field>
				<Field id="minIncrement" label="Minimum increment (THB)" error={fieldErrors.minIncrement}>
					<Input
						id="minIncrement"
						inputMode="decimal"
						value={values.minIncrement}
						onChange={(e) => setField("minIncrement", e.target.value)}
						placeholder="100"
						aria-invalid={fieldErrors.minIncrement ? true : undefined}
						className="h-10"
					/>
				</Field>
			</div>

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<Field id="startTime" label="Start time" error={fieldErrors.startTime}>
					<Input
						id="startTime"
						type="datetime-local"
						value={values.startTime}
						onChange={(e) => setField("startTime", e.target.value)}
						aria-invalid={fieldErrors.startTime ? true : undefined}
						className="h-10"
					/>
				</Field>
				<Field id="endTime" label="End time" error={fieldErrors.endTime}>
					<Input
						id="endTime"
						type="datetime-local"
						value={values.endTime}
						onChange={(e) => setField("endTime", e.target.value)}
						aria-invalid={fieldErrors.endTime ? true : undefined}
						className="h-10"
					/>
				</Field>
			</div>

			{footerNote}

			<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				{onCancel && (
					<Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={submitting}>
						Cancel
					</Button>
				)}
				<Button type="submit" className="h-10 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
					{submitting ? (
						<>
							<Loader2 className="animate-spin" />
							Saving...
						</>
					) : (
						submitLabel
					)}
				</Button>
			</div>
		</form>
	);
}

function Field({
	id,
	label,
	hint,
	error,
	children,
}: {
	id: string;
	label: string;
	hint?: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<Label htmlFor={id}>{label}</Label>
				{hint && <span className="text-xs text-slate-400">{hint}</span>}
			</div>
			{children}
			{error && <p className="text-sm text-red-600">{error}</p>}
		</div>
	);
}
