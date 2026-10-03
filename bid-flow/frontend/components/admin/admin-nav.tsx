"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, LayoutDashboard, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
	{ href: "/admin", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/users", label: "Users", icon: Users },
	{ href: "/admin/auctions", label: "Auctions", icon: Gavel },
	{ href: "/admin/categories", label: "Categories", icon: Tags },
];

// Tabs of the admin area (a client component because it reads the current path)
export function AdminNav() {
	const pathname = usePathname();

	return (
		<nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
			{LINKS.map(({ href, label, icon: Icon }) => {
				const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
				return (
					<Link
						key={href}
						href={href}
						aria-current={active ? "page" : undefined}
						className={cn(
							"flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
							active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
						)}
					>
						<Icon className="h-4 w-4" />
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
