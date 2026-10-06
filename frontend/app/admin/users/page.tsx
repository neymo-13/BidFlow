"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2, Search, UserCheck, UserX, Users, X } from "lucide-react";

import { Pagination } from "@/components/common/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import { getErrorMessage } from "@/lib/http";
import type { AdminUser } from "@/lib/types";

const PAGE_SIZE = 20;
const QUERY_MAX = 100; // same limit as the API

export default function AdminUsersPage() {
	const [q, setQ] = useState("");
	const [page, setPage] = useState(0);
	const [target, setTarget] = useState<AdminUser | null>(null);

	const { data, error, isLoading, reload } = useFetch(
		() => adminApi.listUsers(q || undefined, page, PAGE_SIZE),
		[q, page]
	);

	const search = (next: string) => {
		setQ(next);
		setPage(0);
	};

	return (
		<div className="space-y-6">
			<SearchForm value={q} onSearch={search} />

			<Card>
				<CardContent className="pt-6">
					{error && !isLoading ? (
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<AlertCircle className="h-8 w-8 text-red-500" />
							<p className="text-sm text-red-600">{error}</p>
							<Button variant="outline" size="sm" onClick={reload}>
								Retry
							</Button>
						</div>
					) : !data ? (
						<div className="space-y-2">
							{[...Array(6)].map((_, i) => (
								<Skeleton key={i} className="h-12" />
							))}
						</div>
					) : data.content.length === 0 ? (
						<div className="flex flex-col items-center gap-2 py-12 text-center">
							<Users className="h-8 w-8 text-slate-300" />
							<p className="font-medium text-slate-900">{q ? `No users match "${q}"` : "No users yet"}</p>
							{q && (
								<Button variant="outline" size="sm" className="mt-2" onClick={() => search("")}>
									Clear search
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-6">
							<p className="text-sm text-slate-500">
								{data.totalElements} {data.totalElements === 1 ? "user" : "users"}
								{q && ` matching "${q}"`} · newest first
							</p>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>User</TableHead>
										<TableHead className="hidden md:table-cell">Email</TableHead>
										<TableHead className="hidden sm:table-cell">Joined</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className={isLoading ? "opacity-60" : undefined}>
									{data.content.map((user) => (
										<UserRow key={user.id} user={user} onAction={() => setTarget(user)} />
									))}
								</TableBody>
							</Table>
							<Pagination
								page={data.number}
								totalPages={data.totalPages}
								onPageChange={setPage}
								disabled={isLoading}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			<SuspendDialog
				user={target}
				onClose={() => setTarget(null)}
				onDone={() => {
					setTarget(null);
					reload();
				}}
			/>
		</div>
	);
}

function UserRow({ user, onAction }: { user: AdminUser; onAction: () => void }) {
	const isAdmin = user.role === "ADMIN";

	return (
		<TableRow>
			<TableCell>
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="font-medium text-slate-900">@{user.username}</span>
					{isAdmin && <Badge className="border-0 bg-violet-100 text-violet-700">Admin</Badge>}
					{user.suspended && <Badge className="border-0 bg-red-100 text-red-700">Suspended</Badge>}
					{user.googleLinked && (
						<Badge variant="outline" className="text-slate-500">
							Google
						</Badge>
					)}
				</div>
				<p className="text-sm text-slate-500">{user.fullName}</p>
				<p className="truncate text-xs text-slate-400 md:hidden">{user.email}</p>
			</TableCell>
			<TableCell className="hidden text-slate-600 md:table-cell">{user.email}</TableCell>
			<TableCell className="hidden text-slate-600 sm:table-cell">{formatDateTime(user.createdAt)}</TableCell>
			<TableCell className="text-right">
				{/* Admins can't be suspended (the API refuses too) */}
				{!isAdmin &&
					(user.suspended ? (
						<Button variant="outline" size="sm" onClick={onAction}>
							<UserCheck />
							Unsuspend
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							className="text-red-600 hover:bg-red-50 hover:text-red-700"
							onClick={onAction}
						>
							<UserX />
							Suspend
						</Button>
					))}
			</TableCell>
		</TableRow>
	);
}

// Search runs on Enter / the Search button (not on every keystroke)
function SearchForm({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
	const [text, setText] = useState(value);

	return (
		<form
			role="search"
			className="flex gap-2"
			onSubmit={(e) => {
				e.preventDefault();
				onSearch(text.trim());
			}}
		>
			<div className="relative flex-1">
				<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					type="search"
					value={text}
					maxLength={QUERY_MAX}
					onChange={(e) => setText(e.target.value)}
					placeholder="Search by username, email or name"
					aria-label="Search users"
					className="h-9 bg-white pr-9 pl-9"
				/>
				{text && (
					<button
						type="button"
						onClick={() => {
							setText("");
							onSearch("");
						}}
						className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						aria-label="Clear search"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
			<Button type="submit" variant="outline" className="h-9">
				Search
			</Button>
		</form>
	);
}

// Confirm suspend / unsuspend — open by passing a user, null closes it
function SuspendDialog({
	user,
	onClose,
	onDone,
}: {
	user: AdminUser | null;
	onClose: () => void;
	onDone: () => void;
}) {
	const [working, setWorking] = useState(false);
	const suspending = user !== null && !user.suspended;

	const handleConfirm = async () => {
		if (!user) return;
		setWorking(true);
		try {
			const updated = suspending ? await adminApi.suspendUser(user.id) : await adminApi.unsuspendUser(user.id);
			toast.success(updated.suspended ? `@${updated.username} is suspended` : `@${updated.username} can log in again`);
			onDone();
		} catch (e) {
			toast.error(getErrorMessage(e));
		} finally {
			setWorking(false);
		}
	};

	return (
		<Dialog open={user !== null} onOpenChange={(open) => !open && !working && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{suspending ? "Suspend" : "Unsuspend"} @{user?.username}?
					</DialogTitle>
					<DialogDescription>
						{suspending
							? "They are signed out right away and can't log in, bid or sell until you unsuspend them. Their auctions, bids and wallet stay as they are."
							: "They can log in and use BidFlow again."}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={working}>
						Cancel
					</Button>
					<Button
						className={suspending ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
						onClick={handleConfirm}
						disabled={working}
					>
						{working ? <Loader2 className="animate-spin" /> : suspending ? <UserX /> : <UserCheck />}
						{suspending ? "Suspend" : "Unsuspend"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
