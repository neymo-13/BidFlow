"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification/notification-bell";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatCurrency } from "@/lib/format";
import {
	Bell,
	Gavel,
	HandCoins,
	LayoutList,
	Wallet,
	LogOut,
	User as UserIcon,
	PlusCircle,
	ChevronDown,
	ShieldCheck,
} from "lucide-react";

export function Navbar() {
	const router = useRouter();
	const { user, logout } = useAuthStore();

	const handleLogout = () => {
		logout();
		router.push("/login");
	};

	return (
		<nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between gap-4 py-3">
					{/* Left: Logo + Nav */}
					<div className="flex items-center gap-4">
						<Link href="/" className="flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-transform hover:scale-105">
								<Gavel className="h-4 w-4" />
							</div>

							<span className="text-lg font-semibold tracking-tight text-slate-900">BidFlow</span>
						</Link>

						<div className="hidden md:flex items-center gap-2">
							<Link href="/auctions" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-150 ease-in-out">
								Auctions
							</Link>

							{user && (
								<Link href="/auctions/create" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-150 ease-in-out">
									Sell an item
								</Link>
							)}
						</div>
					</div>

					{/* Right: Wallet, Actions, User */}
					<div className="flex items-center gap-3">
						{/* Always mounted so it can reset its polling state on logout */}
						<NotificationBell />

						{user ? (
							<>
								<Link href="/wallet" className="hidden md:inline-flex items-center gap-2 rounded-full px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-sm font-medium shadow-sm hover:shadow-md transition-all">
									<Wallet className="h-4 w-4" />
									<span>{formatCurrency(user.walletBalance || 0)}</span>
								</Link>

								<DropdownMenu>
									<DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1 transition-shadow hover:shadow-sm active:scale-[0.98]">
										<Avatar className="h-9 w-9">
											<AvatarFallback className="bg-blue-600 text-sm font-semibold text-white">{user.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
										</Avatar>

										<div className="hidden lg:flex flex-col leading-tight">
											<span className="text-sm font-medium text-slate-900 truncate max-w-[140px]">{user.fullName}</span>
											<span className="text-xs text-slate-500">@{user.username}</span>
										</div>

										<ChevronDown className="hidden lg:block h-4 w-4 text-slate-400" />
									</DropdownMenuTrigger>

									<DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-lg border border-slate-100 bg-white p-1 shadow-md">
										<div className="px-3 py-2">
											<p className="font-medium text-slate-900">{user.fullName}</p>
											<p className="mt-0.5 text-xs text-slate-500">@{user.username}</p>
										</div>

										<DropdownMenuSeparator />

										{/* Top-bar links are hidden on small screens */}
										<DropdownMenuItem onClick={() => router.push('/auctions')} className="rounded-md hover:bg-slate-50 transition-colors md:hidden">
											<Gavel className="mr-2 h-4 w-4" />
											Browse auctions
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => router.push('/auctions/create')} className="rounded-md hover:bg-slate-50 transition-colors md:hidden">
											<PlusCircle className="mr-2 h-4 w-4" />
											Sell an item
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => router.push('/profile')} className="rounded-md hover:bg-slate-50 transition-colors">
											<UserIcon className="mr-2 h-4 w-4" />
											Profile
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => router.push('/wallet')} className="rounded-md hover:bg-slate-50 transition-colors">
											<Wallet className="mr-2 h-4 w-4 text-emerald-600" />
											Wallet
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => router.push('/bids')} className="rounded-md hover:bg-slate-50 transition-colors">
											<HandCoins className="mr-2 h-4 w-4" />
											My Bids
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => router.push('/auctions/my')} className="rounded-md hover:bg-slate-50 transition-colors">
											<LayoutList className="mr-2 h-4 w-4" />
											My Auctions
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => router.push('/notifications')} className="rounded-md hover:bg-slate-50 transition-colors">
											<Bell className="mr-2 h-4 w-4" />
											Notifications
										</DropdownMenuItem>

										{/* UX only — admin pages and API check the role again */}
										{user.role === "ADMIN" && (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem onClick={() => router.push('/admin')} className="rounded-md text-violet-700 hover:bg-violet-50 transition-colors">
													<ShieldCheck className="mr-2 h-4 w-4" />
													Admin
												</DropdownMenuItem>
											</>
										)}

										<DropdownMenuSeparator />

										<DropdownMenuItem onClick={handleLogout} className="rounded-md text-red-600 hover:bg-red-50 transition-colors">
											<LogOut className="mr-2 h-4 w-4" />
											Logout
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						) : (
							<>
								<Link href="/auctions" className="px-2 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 md:hidden">
									Auctions
								</Link>

								<Button variant="ghost" className="rounded-lg text-slate-600 hover:text-blue-600 transition-colors" onClick={() => router.push('/login')}>
									Sign in
								</Button>

								<Button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" onClick={() => router.push('/register')}>
									Get started
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}

export default Navbar;
