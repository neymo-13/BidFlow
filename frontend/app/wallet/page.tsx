"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Loader2, Receipt, Wallet } from "lucide-react";

import { RequireAuth } from "@/components/auth/auth-guard";
import { Pagination } from "@/components/common/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { walletApi } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useFetch } from "@/lib/hooks/use-fetch";
import { ApiError, getErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/lib/store/auth-store";
import { WalletTransaction } from "@/lib/types";

const PAGE_SIZE = 20;
// Backend has no upper bound yet — cap here to avoid DECIMAL(15,2) overflow (500)
const MAX_AMOUNT = 10_000_000;
const QUICK_AMOUNTS = [1000, 5000, 10000];

const TX_TYPES: Record<WalletTransaction["type"], { label: string; className: string }> = {
	DEPOSIT: { label: "Deposit", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
	WITHDRAW: { label: "Withdraw", className: "border-red-200 bg-red-50 text-red-700" },
	BID_HOLD: { label: "Bid hold", className: "border-amber-200 bg-amber-50 text-amber-700" },
	BID_RELEASE: { label: "Bid refund", className: "border-blue-200 bg-blue-50 text-blue-700" },
	WIN_PAYMENT: { label: "Win payment", className: "border-slate-200 bg-slate-100 text-slate-700" },
	SELLER_PAYOUT: { label: "Sale payout", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

export default function WalletPage() {
	return (
		<RequireAuth>
			<WalletContent />
		</RequireAuth>
	);
}

function WalletContent() {
	const refreshUser = useAuthStore((s) => s.refreshUser);

	const [page, setPage] = useState(0);

	const walletQuery = useFetch(() => walletApi.getMyWallet(), []);
	const txQuery = useFetch(() => walletApi.getTransactions(page, PAGE_SIZE), [page]);

	const wallet = walletQuery.data;
	const walletError = walletQuery.error;
	const txPage = txQuery.data;
	const txLoading = txQuery.isLoading;
	const txError = txQuery.error;

	// After deposit/withdraw: refresh balance (page + navbar) and show newest transactions
	const handleCompleted = async () => {
		walletQuery.reload();
		if (page === 0) {
			txQuery.reload();
		} else {
			setPage(0);
		}
		await refreshUser();
	};

	const balance = wallet ? Number(wallet.balance) : null;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Wallet</h1>
				<p className="mt-1 text-sm text-slate-500">
					Manage your balance and review every transaction.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Left: balance + deposit/withdraw */}
				<div className="space-y-6">
					<Card className="border-emerald-200 bg-linear-to-br from-emerald-50 to-white">
						<CardContent className="pt-6">
							<div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
								<Wallet className="h-4 w-4" />
								Available balance
							</div>

							{walletError ? (
								<div className="mt-3 space-y-2">
									<p className="text-sm text-red-600">{walletError}</p>
									<Button variant="outline" size="sm" onClick={walletQuery.reload}>
										Retry
									</Button>
								</div>
							) : balance === null ? (
								<Skeleton className="mt-3 h-10 w-48" />
							) : (
								<p className="mt-2 text-4xl font-bold tracking-tight text-emerald-600">
									{formatCurrency(balance, 2)}
								</p>
							)}

							<p className="mt-2 text-xs text-slate-500">
								Funds for your active bids are already deducted from this balance.
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Add or withdraw funds</CardTitle>
							<CardDescription>Virtual currency for bidding on BidFlow.</CardDescription>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="deposit">
								<TabsList className="w-full">
									<TabsTrigger value="deposit">
										<ArrowDownLeft />
										Deposit
									</TabsTrigger>
									<TabsTrigger value="withdraw">
										<ArrowUpRight />
										Withdraw
									</TabsTrigger>
								</TabsList>

								<TabsContent value="deposit" className="pt-4">
									<AmountForm mode="deposit" balance={balance} onCompleted={handleCompleted} />
								</TabsContent>
								<TabsContent value="withdraw" className="pt-4">
									<AmountForm mode="withdraw" balance={balance} onCompleted={handleCompleted} />
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</div>

				{/* Right: transaction history */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Transaction history</CardTitle>
						<CardDescription>
							{txPage ? `${txPage.totalElements} transactions` : "Deposits, withdrawals, bid holds and payouts"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{txLoading && !txPage ? (
							<div className="space-y-2">
								{[...Array(5)].map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : txError ? (
							<div className="flex flex-col items-center gap-3 py-10 text-center">
								<AlertCircle className="h-8 w-8 text-red-500" />
								<p className="text-sm text-red-600">{txError}</p>
								<Button variant="outline" size="sm" onClick={txQuery.reload}>
									Retry
								</Button>
							</div>
						) : !txPage || txPage.content.length === 0 ? (
							<div className="flex flex-col items-center gap-2 py-12 text-center">
								<Receipt className="h-8 w-8 text-slate-300" />
								<p className="font-medium text-slate-900">No transactions yet</p>
								<p className="text-sm text-slate-500">Make your first deposit to start bidding.</p>
							</div>
						) : (
							<>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Type</TableHead>
											<TableHead className="hidden md:table-cell">Description</TableHead>
											<TableHead className="text-right">Amount</TableHead>
											<TableHead className="text-right">Balance</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody className={txLoading ? "opacity-50" : undefined}>
										{txPage.content.map((tx) => (
											<TransactionRow key={tx.id} tx={tx} />
										))}
									</TableBody>
								</Table>

								<Pagination
									page={txPage.number}
									totalPages={txPage.totalPages}
									onPageChange={setPage}
									disabled={txLoading}
								/>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// =====================================================
// Deposit / withdraw form
// =====================================================
function AmountForm({
	mode,
	balance,
	onCompleted,
}: {
	mode: "deposit" | "withdraw";
	balance: number | null;
	onCompleted: () => Promise<void>;
}) {
	const [amount, setAmount] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const isWithdraw = mode === "withdraw";
	const inputId = `${mode}-amount`;

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();

		const validationError = validateAmount(amount, isWithdraw ? balance : null);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError(null);
		setSubmitting(true);
		try {
			const value = Number(amount.trim());
			if (isWithdraw) {
				await walletApi.withdraw(value);
			} else {
				await walletApi.deposit(value);
			}
			toast.success(`${isWithdraw ? "Withdrew" : "Deposited"} ${formatCurrency(value, 2)}`);
			setAmount("");
			await onCompleted();
		} catch (err) {
			setError(walletErrorMessage(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-3" noValidate>
			<div className="grid grid-cols-3 gap-2">
				{QUICK_AMOUNTS.map((value) => (
					<Button
						key={value}
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							setAmount(String(value));
							setError(null);
						}}
					>
						{formatCurrency(value)}
					</Button>
				))}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={inputId}>Amount (THB)</Label>
				<div className="relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">฿</span>
					<Input
						id={inputId}
						inputMode="decimal"
						autoComplete="off"
						placeholder="0.00"
						value={amount}
						onChange={(e) => {
							setAmount(e.target.value);
							setError(null);
						}}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? `${inputId}-error` : undefined}
						className="h-10 pl-7"
					/>
				</div>
				{error && (
					<p id={`${inputId}-error`} className="text-sm text-red-600">
						{error}
					</p>
				)}
			</div>

			<Button
				type="submit"
				className={`h-10 w-full ${isWithdraw ? "" : "bg-emerald-600 hover:bg-emerald-700"}`}
				variant={isWithdraw ? "outline" : "default"}
				disabled={submitting}
			>
				{submitting ? (
					<>
						<Loader2 className="animate-spin" />
						Processing...
					</>
				) : isWithdraw ? (
					"Withdraw"
				) : (
					"Deposit"
				)}
			</Button>
		</form>
	);
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
	const type = TX_TYPES[tx.type] ?? { label: tx.type, className: "" };
	const amount = Number(tx.amount);
	const isCredit = amount >= 0;

	return (
		<TableRow>
			<TableCell className="whitespace-nowrap text-slate-600">{formatDateTime(tx.createdAt)}</TableCell>
			<TableCell>
				<Badge variant="outline" className={type.className}>
					{type.label}
				</Badge>
			</TableCell>
			<TableCell className="hidden max-w-xs truncate text-slate-600 md:table-cell">
				{tx.description}
			</TableCell>
			<TableCell
				className={`whitespace-nowrap text-right font-medium ${isCredit ? "text-emerald-600" : "text-red-600"}`}
			>
				{isCredit ? "+" : "−"}
				{formatCurrency(Math.abs(amount), 2)}
			</TableCell>
			<TableCell className="whitespace-nowrap text-right text-slate-700">
				{formatCurrency(Number(tx.balanceAfter), 2)}
			</TableCell>
		</TableRow>
	);
}

// =====================================================
// Helpers
// =====================================================
function validateAmount(raw: string, maxAllowed: number | null): string | null {
	const value = raw.trim();
	if (!value) return "Please enter an amount";
	if (!/^\d+(\.\d{1,2})?$/.test(value)) return "Enter a positive number with up to 2 decimal places";

	const amount = Number(value);
	if (amount <= 0) return "Amount must be greater than 0";
	if (amount > MAX_AMOUNT) return `Maximum ${formatCurrency(MAX_AMOUNT)} per transaction`;
	if (maxAllowed !== null && amount > maxAllowed) {
		return `Insufficient balance. You have ${formatCurrency(maxAllowed, 2)}`;
	}
	return null;
}

// Backend message includes the internal user id — show a friendlier one instead
function walletErrorMessage(err: unknown): string {
	if (axios.isAxiosError<ApiError>(err) && err.response?.data?.error === "Insufficient Balance") {
		const current = Number(err.response.data.details?.currentBalance);
		return Number.isFinite(current)
			? `Insufficient balance. You have ${formatCurrency(current, 2)}`
			: "Insufficient balance";
	}
	return getErrorMessage(err);
}
