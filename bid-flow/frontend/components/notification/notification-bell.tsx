"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/lib/store/auth-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import { Notification } from "@/lib/types";

const POLL_INTERVAL_MS = 30_000;
const PREVIEW_COUNT = 5;

export function NotificationBell() {
	const router = useRouter();
	const user = useAuthStore((s) => s.user);
	const { items, unreadCount, fetchLatest, markRead, reset } = useNotificationStore();

	// Poll only while logged in; skip ticks while the tab is hidden
	useEffect(() => {
		if (!user) {
			reset();
			return;
		}

		fetchLatest();
		const timer = setInterval(() => {
			if (!document.hidden) fetchLatest();
		}, POLL_INTERVAL_MS);

		return () => clearInterval(timer);
	}, [user, fetchLatest, reset]);

	if (!user) return null;

	const handleOpen = async (notification: Notification) => {
		if (!notification.isRead) {
			try {
				await markRead(notification.id);
			} catch (e) {
				toast.error(getErrorMessage(e));
			}
		}
		if (notification.auctionItemId) {
			router.push(`/auctions/${notification.auctionItemId}`);
		}
	};

	const preview = items.slice(0, PREVIEW_COUNT);
	const badge = unreadCount > 9 ? "9+" : String(unreadCount);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
				className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
			>
				<Bell className="h-5 w-5" />
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
						{badge}
					</span>
				)}
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-lg border border-slate-100 bg-white p-1 shadow-md">
				<div className="flex items-center justify-between px-3 py-2">
					<p className="font-medium text-slate-900">Notifications</p>
					{unreadCount > 0 && <span className="text-xs text-slate-500">{unreadCount} unread</span>}
				</div>
				<DropdownMenuSeparator />

				{preview.length === 0 ? (
					<p className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet</p>
				) : (
					preview.map((n) => (
						<DropdownMenuItem
							key={n.id}
							onClick={() => handleOpen(n)}
							className="items-start gap-2 rounded-md px-3 py-2 hover:bg-slate-50"
						>
							<span
								className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-blue-600"}`}
								aria-hidden
							/>
							<span className="min-w-0">
								<span className={`block truncate text-sm ${n.isRead ? "text-slate-600" : "font-semibold text-slate-900"}`}>
									{n.title}
								</span>
								<span className="block truncate text-xs text-slate-500">{n.message}</span>
								<span className="mt-0.5 block text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</span>
							</span>
						</DropdownMenuItem>
					))
				)}

				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => router.push("/notifications")}
					className="justify-center rounded-md py-2 text-sm font-medium text-blue-600 hover:bg-slate-50"
				>
					View all notifications
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
