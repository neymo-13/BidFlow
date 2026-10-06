import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
	title: "BidFlow — Real-time Auction Platform",
	description: "Bid on items in real-time. Concurrent-safe, fast, and secure.",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body className="antialiased">
				<AuthProvider>
					<MainLayout>{children}</MainLayout>
					<Toaster position="top-right" richColors />
				</AuthProvider>
			</body>
		</html>
	);
}
