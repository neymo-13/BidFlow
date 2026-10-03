"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff, Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";
import { getErrorMessage } from "@/lib/http";
import type { AdminCategory } from "@/lib/types";

const NAME_MAX = 50; // same limit as the API
const OTHER_SLUG = "other"; // the fallback category — can't be hidden or deleted

function validateName(raw: string): string | null {
	const name = raw.trim();
	if (!name) return "Name is required";
	if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`;
	return null;
}

export default function AdminCategoriesPage() {
	const { data: categories, error, isLoading, reload } = useFetch(() => adminApi.listCategories(), []);
	const [renaming, setRenaming] = useState<AdminCategory | null>(null);
	const [deleting, setDeleting] = useState<AdminCategory | null>(null);
	const [busyId, setBusyId] = useState<number | null>(null);

	const toggleVisible = async (category: AdminCategory) => {
		setBusyId(category.id);
		try {
			const updated = await adminApi.updateCategory(category.id, { active: !category.active });
			toast.success(
				updated.active
					? `"${updated.name}" is visible again`
					: `"${updated.name}" is hidden — existing auctions keep it`
			);
			reload();
		} catch (e) {
			toast.error(getErrorMessage(e));
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="space-y-6">
			<AddCategoryForm onAdded={reload} />

			<Card>
				<CardHeader>
					<CardTitle>Categories</CardTitle>
					<CardDescription>
						Hidden categories disappear from the category filter and the auction form. Auctions that already
						use them keep them.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error && !categories ? (
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<AlertCircle className="h-8 w-8 text-red-500" />
							<p className="text-sm text-red-600">{error}</p>
							<Button variant="outline" size="sm" onClick={reload}>
								Retry
							</Button>
						</div>
					) : !categories ? (
						<div className="space-y-2">
							{[...Array(5)].map((_, i) => (
								<Skeleton key={i} className="h-10" />
							))}
						</div>
					) : categories.length === 0 ? (
						<div className="flex flex-col items-center gap-2 py-12 text-center">
							<Tags className="h-8 w-8 text-slate-300" />
							<p className="font-medium text-slate-900">No categories yet</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="hidden sm:table-cell">Slug</TableHead>
									<TableHead className="text-right">Auctions</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody className={isLoading ? "opacity-60" : undefined}>
								{categories.map((category) => (
									<CategoryRow
										key={category.id}
										category={category}
										busy={busyId === category.id}
										onRename={() => setRenaming(category)}
										onToggle={() => toggleVisible(category)}
										onDelete={() => setDeleting(category)}
									/>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<RenameDialog
				category={renaming}
				onClose={() => setRenaming(null)}
				onRenamed={() => {
					setRenaming(null);
					reload();
				}}
			/>
			<DeleteDialog
				category={deleting}
				onClose={() => setDeleting(null)}
				onDeleted={() => {
					setDeleting(null);
					reload();
				}}
			/>
		</div>
	);
}

// =====================================================
// Table row — buttons that can't be used say why (a disabled button's tooltip isn't reliable)
// =====================================================
function CategoryRow({
	category,
	busy,
	onRename,
	onToggle,
	onDelete,
}: {
	category: AdminCategory;
	busy: boolean;
	onRename: () => void;
	onToggle: () => void;
	onDelete: () => void;
}) {
	const isOther = category.slug === OTHER_SLUG;
	const inUse = category.auctionCount > 0;
	const reason = isOther
		? "Other is the fallback category — it can't be hidden or deleted."
		: inUse
			? `Used by ${category.auctionCount} ${category.auctionCount === 1 ? "auction" : "auctions"} — hide it instead of deleting.`
			: null;

	return (
		<TableRow>
			<TableCell className="font-medium text-slate-900">{category.name}</TableCell>
			<TableCell className="hidden font-mono text-xs text-slate-500 sm:table-cell">{category.slug}</TableCell>
			<TableCell className="text-right">{category.auctionCount}</TableCell>
			<TableCell>
				{category.active ? (
					<Badge className="border-0 bg-green-50 text-green-700">Visible</Badge>
				) : (
					<Badge className="border-0 bg-slate-100 text-slate-600">Hidden</Badge>
				)}
			</TableCell>
			<TableCell>
				<div className="flex flex-wrap justify-end gap-1.5">
					<Button variant="outline" size="sm" onClick={onRename} disabled={busy}>
						<Pencil />
						Rename
					</Button>
					<Button variant="outline" size="sm" onClick={onToggle} disabled={busy || isOther}>
						{busy ? <Loader2 className="animate-spin" /> : category.active ? <EyeOff /> : <Eye />}
						{category.active ? "Hide" : "Show"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-red-600 hover:bg-red-50 hover:text-red-700"
						onClick={onDelete}
						disabled={busy || isOther || inUse}
					>
						<Trash2 />
						Delete
					</Button>
				</div>
				{reason && <p className="mt-1 text-right text-xs text-slate-400">{reason}</p>}
			</TableCell>
		</TableRow>
	);
}

// =====================================================
// Add a category
// =====================================================
function AddCategoryForm({ onAdded }: { onAdded: () => void }) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		const validationError = validateName(name);
		if (validationError) {
			setError(validationError);
			return;
		}

		setSubmitting(true);
		try {
			const created = await adminApi.createCategory({ name: name.trim() });
			toast.success(`Added "${created.name}"`);
			setName("");
			setError(null);
			onAdded();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Add a category</CardTitle>
				<CardDescription>The URL slug is created from the name and never changes.</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
					<div className="flex-1 space-y-1.5">
						<Label htmlFor="new-category" className="sr-only">
							Category name
						</Label>
						<Input
							id="new-category"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError(null);
							}}
							maxLength={NAME_MAX}
							placeholder="e.g. Books"
							aria-invalid={error ? true : undefined}
							className="h-10"
						/>
						{error && <p className="text-sm text-red-600">{error}</p>}
					</div>
					<Button type="submit" className="h-10 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
						{submitting ? <Loader2 className="animate-spin" /> : <Plus />}
						Add category
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

// =====================================================
// Rename dialog — open by passing a category, null closes it
// =====================================================
function RenameDialog({
	category,
	onClose,
	onRenamed,
}: {
	category: AdminCategory | null;
	onClose: () => void;
	onRenamed: () => void;
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [openedFor, setOpenedFor] = useState<number | null>(null);

	// Reset the field each time the dialog opens for a category
	if (category && category.id !== openedFor) {
		setOpenedFor(category.id);
		setName(category.name);
		setError(null);
	}
	if (!category && openedFor !== null) {
		setOpenedFor(null);
	}

	const unchanged = category !== null && name.trim() === category.name;

	const handleSave = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!category || unchanged) return;
		const validationError = validateName(name);
		if (validationError) {
			setError(validationError);
			return;
		}

		setSaving(true);
		try {
			const updated = await adminApi.updateCategory(category.id, { name: name.trim() });
			toast.success(`Renamed to "${updated.name}"`);
			onRenamed();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={category !== null} onOpenChange={(open) => !open && !saving && onClose()}>
			<DialogContent>
				<form onSubmit={handleSave} noValidate className="space-y-4">
					<DialogHeader>
						<DialogTitle>Rename category</DialogTitle>
						<DialogDescription>
							The slug <span className="font-mono">{category?.slug}</span> stays the same, so existing links
							keep working.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-1.5">
						<Label htmlFor="rename-category">Name</Label>
						<Input
							id="rename-category"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError(null);
							}}
							maxLength={NAME_MAX}
							aria-invalid={error ? true : undefined}
							className="h-10"
						/>
						{error && <p className="text-sm text-red-600">{error}</p>}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose} disabled={saving}>
							Cancel
						</Button>
						<Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving || unchanged}>
							{saving && <Loader2 className="animate-spin" />}
							Save
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// =====================================================
// Delete confirmation — only offered for unused categories (the API refuses the rest)
// =====================================================
function DeleteDialog({
	category,
	onClose,
	onDeleted,
}: {
	category: AdminCategory | null;
	onClose: () => void;
	onDeleted: () => void;
}) {
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!category) return;
		setDeleting(true);
		try {
			await adminApi.deleteCategory(category.id);
			toast.success(`Deleted "${category.name}"`);
			onDeleted();
		} catch (e) {
			toast.error(getErrorMessage(e));
		} finally {
			setDeleting(false);
		}
	};

	return (
		<Dialog open={category !== null} onOpenChange={(open) => !open && !deleting && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete &quot;{category?.name}&quot;?</DialogTitle>
					<DialogDescription>No auction uses this category. This can&apos;t be undone.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={deleting}>
						Keep it
					</Button>
					<Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
						{deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
