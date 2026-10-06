import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { RequireAdmin } from "@/components/auth/auth-guard";

export const metadata: Metadata = {
	title: "Admin — BidFlow",
};

// Shared by every /admin page — the guard runs once for the whole area
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<RequireAdmin>
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
						<ShieldCheck className="h-7 w-7 text-violet-600" />
						Admin
					</h1>
					<AdminNav />
				</div>
				{children}
			</div>
		</RequireAdmin>
	);
}
