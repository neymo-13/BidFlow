"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, Bell, Check, ExternalLink } from "lucide-react";

import { RequireAuth } from "@/components/auth/auth-guard";
import { Pagination } from "@/components/common/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import { getErrorMessage } from "@/lib/http";
import { useNotificationStore } from "@/lib/store/notification-store";
import { Notification } from "@/lib/types";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
	return (
		<RequireAuth>
			<NotificationsContent />
		</RequireAuth>
	);
}

function NotificationsContent() {
	const [page, setPage] = useState(0);
	const [markingId, setMarkingId] = useState<number | null>(null);
	const markRead = useNotificationStore((s) => s.markRead);
	const fetchLatest = useNotificationStore((s) => s.fetchLatest);

	const { data, error, isLoading, reload } = useFetch(
		() => notificationApi.getMyNotifications(page, PAGE_SIZE),
		[page]
	);

	const handleMarkRead = async (notification: Notification) => {
		setMarkingId(notification.id);
		try {
			await markRead(notification.id);
			reload();
			fetchLatest(); // keep the navbar badge in sync
		} catch (e) {
			toast.error(getErrorMessage(e));
		} finally {
			setMarkingId(null);
		}
	};

	const items = data?.content ?? [];

	return (
		<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Notifications</h1>
				<p className="mt-1 text-sm text-slate-500">Updates about auctions you sell and win.</p>
			</div>

			{error && !isLoading ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<AlertCircle className="h-8 w-8 text-red-500" />
						<p className="text-sm text-red-600">{error}</p>
						<Button variant="outline" size="sm" onClick={reload}>
							Retry
						</Button>
					</CardContent>
				</Card>
			) : isLoading && !data ? (
				<div className="space-y-3">
					{[...Array(4)].map((_, i) => (
						<Skeleton key={i} className="h-20 w-full rounded-xl" />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
						<Bell className="h-7 w-7 text-slate-400" />
					</div>
					<h2 className="font-semibold text-slate-900">No notifications yet</h2>
					<p className="mt-1 text-sm text-slate-500">
						You&apos;ll be notified when your auctions end or you win an item.
					</p>
				</div>
			) : (
				<div className="space-y-6">
					<ul className={`space-y-3 ${isLoading ? "opacity-60" : ""}`}>
						{items.map((n) => (
							<li
								key={n.id}
								className={`rounded-xl border p-4 shadow-sm ${n.isRead ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/50"}`}
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div className="flex min-w-0 gap-3">
										<span
											className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-slate-200" : "bg-blue-600"}`}
											aria-hidden
										/>
										<div className="min-w-0">
											<p className={n.isRead ? "text-slate-700" : "font-semibold text-slate-900"}>
												{n.title}
											</p>
											<p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
											<p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
										</div>
									</div>

									<div className="flex shrink-0 gap-2 pl-5 sm:pl-0">
										{n.auctionItemId && (
											<Link
												href={`/auctions/${n.auctionItemId}`}
												onClick={() => !n.isRead && markRead(n.id).catch(() => undefined)}
												className={buttonVariants({ variant: "outline", size: "sm" })}
											>
												<ExternalLink />
												View auction
											</Link>
										)}
										{!n.isRead && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleMarkRead(n)}
												disabled={markingId === n.id}
											>
												<Check />
												Mark as read
											</Button>
										)}
									</div>
								</div>
							</li>
						))}
					</ul>

					<Pagination
						page={data?.number ?? 0}
						totalPages={data?.totalPages ?? 0}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>
			)}
		</div>
	);
}
