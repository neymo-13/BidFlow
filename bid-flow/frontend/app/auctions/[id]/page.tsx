"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Auction, BidSummary } from "@/lib/types";
import { auctionApi, bidApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatCurrency, formatDateTime, timeRemaining } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  TrendingUp,
  User as UserIcon,
  Trophy,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const auctionId = Number(id);
  const router = useRouter();
  const { user } = useAuthStore();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<BidSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bid form state
  const [bidAmount, setBidAmount] = useState("");
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [auctionId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [auctionRes, bidsRes] = await Promise.all([
        auctionApi.getById(auctionId),
        bidApi.getBids(auctionId, 0, 20),
      ]);
      setAuction(auctionRes);
      setBids(bidsRes.content);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const minBid = auction
    ? auction.currentPrice + auction.minIncrement
    : 0;

  const handlePlaceBid = async () => {
    if (!user) {
      router.push(`/login?redirect=/auctions/${auctionId}`);
      return;
    }

    const amount = Number(bidAmount);
    if (!amount || amount < minBid) {
      setBidError(`Bid must be at least ${formatCurrency(minBid)}`);
      return;
    }

    setBidLoading(true);
    setBidError(null);
    setBidSuccess(false);

    try {
      await bidApi.placeBid(auctionId, amount);
      setBidSuccess(true);
      setBidAmount("");
      await loadData(); // Reload auction + bids
      setTimeout(() => setBidSuccess(false), 3000);
    } catch (e) {
      setBidError(getErrorMessage(e));
    } finally {
      setBidLoading(false);
    }
  };

  const quickAmounts = auction
    ? [
        auction.currentPrice + auction.minIncrement,
        auction.currentPrice + auction.minIncrement * 2,
        auction.currentPrice + auction.minIncrement * 5,
        auction.currentPrice + auction.minIncrement * 10,
      ]
    : [];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error || "Auction not found"}</p>
            <Button onClick={() => router.push("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = auction.status === "ACTIVE";
  const isEnded = auction.status === "ENDED";
  const isSeller = user?.username === auction.sellerUsername;
  const isWinner = isEnded && user?.username === auction.winnerUsername;
  const imageUrl = `https://picsum.photos/seed/auction-${auction.id}/800/600`;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">Auctions</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{auction.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Image */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100">
              <img
                src={imageUrl}
                alt={auction.title}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          {/* Description */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {auction.description || "No description provided"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Info + Bid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title + Status */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-2xl font-bold">{auction.title}</h1>
              {isActive && (
                <Badge className="bg-green-500 text-white shrink-0">
                  ● LIVE
                </Badge>
              )}
              {isEnded && (
                <Badge className="bg-gray-700 text-white shrink-0">
                  ENDED
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <UserIcon className="w-4 h-4" />
              <span>Seller: @{auction.sellerUsername}</span>
            </div>
          </div>

          <Separator />

          {/* Current Price */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">
                {isEnded ? "Winning bid" : "Current bid"}
              </p>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                {formatCurrency(auction.currentPrice)}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {auction.totalBids} bids
                </span>
                {isActive && (
                  <span className="flex items-center gap-1 text-orange-600 font-medium">
                    <Clock className="w-4 h-4" />
                    {timeRemaining(auction.endTime)}
                  </span>
                )}
              </div>

              {isEnded && auction.winnerUsername && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                    <Trophy className="w-4 h-4" />
                    Winner: @{auction.winnerUsername}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your status */}
          {user && isActive && bids.length > 0 && (
            <>
              {bids[0].bidderUsername === user.username ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-700 font-medium">
                    🏆 You&apos;re winning!
                  </p>
                </div>
              ) : bids.some((b) => b.bidderUsername === user.username) ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-red-700 font-medium">
                    ⚠️ You&apos;ve been outbid!
                  </p>
                </div>
              ) : null}
            </>
          )}

          {/* Bid Form */}
          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Place Your Bid
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Minimum: {formatCurrency(minBid)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {!user ? (
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/login?redirect=/auctions/${auctionId}`)}
                  >
                    Sign in to Bid
                  </Button>
                ) : isSeller ? (
                  <div className="p-3 bg-gray-50 rounded text-center text-sm text-gray-600">
                    You can&apos;t bid on your own auction
                  </div>
                ) : (
                  <>
                    {/* Quick amount buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {quickAmounts.map((amount, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => setBidAmount(String(amount))}
                        >
                          {formatCurrency(amount)}
                        </Button>
                      ))}
                    </div>

                    {/* Custom input */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          ฿
                        </span>
                        <Input
                          type="number"
                          placeholder={String(minBid)}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          min={minBid}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    {bidError && (
                      <div className="p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                        {bidError}
                      </div>
                    )}

                    {bidSuccess && (
                      <div className="p-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded">
                        ✅ Bid placed successfully!
                      </div>
                    )}

                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handlePlaceBid}
                      disabled={bidLoading || !bidAmount}
                    >
                      {bidLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Placing bid...
                        </>
                      ) : (
                        `Place Bid — ${bidAmount ? formatCurrency(Number(bidAmount)) : formatCurrency(minBid)}`
                      )}
                    </Button>

                    {user && (
                      <p className="text-xs text-gray-500 text-center">
                        Your balance: {formatCurrency(user.walletBalance || 0)}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bid History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bid History ({bids.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bids.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No bids yet — be the first!
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {bids.map((bid, i) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        i === 0 ? "bg-blue-50 border border-blue-200" : ""
                      } ${
                        bid.bidderUsername === user?.username
                          ? "font-medium"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                          {bid.bidderUsername[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm">
                            @{bid.bidderUsername}
                            {bid.bidderUsername === user?.username && (
                              <span className="text-blue-600 text-xs ml-1">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(bid.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(bid.bidAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}