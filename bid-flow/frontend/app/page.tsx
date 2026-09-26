"use client";

import { useEffect, useState } from "react";
import { AuctionCard } from "@/components/auction/auction-card";
import { AuctionSummary } from "@/lib/types";
import { auctionApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Gavel, ArrowRight, RefreshCw } from "lucide-react";

export default function HomePage() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuctions();
  }, []);

  const loadAuctions = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await auctionApi.list("ACTIVE", 0, 20);
      setAuctions(res.content);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/40 via-slate-50/30 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-blue-50/50 via-white to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                <Gavel className="h-4 w-4" />
                Live Auction Platform
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Bid in real time.
                <br />
                <span className="text-blue-600">Win with confidence.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Discover live auctions, place competitive bids, and follow every
                auction in real time with a fast and transparent bidding
                experience.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-600"
                  onClick={() =>
                    document
                      .getElementById("auctions")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Browse Auctions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Preview card on the right */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=900&q=80"
                    alt="Auction preview"
                    className="w-full h-56 object-cover"
                  />

                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">@creator</p>
                      <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">Live</div>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900">Premium Painting: Sunrise Over Sea</h3>
                    <p className="mt-2 text-sm text-slate-500">Current bid <span className="ml-2 font-bold text-slate-900">$3,200</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auctions */}
      <section
        id="auctions"
        className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16"
      >
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">
                Live now
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              Live Auctions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {auctions.length}{" "}
              {auctions.length === 1 ? "auction" : "auctions"} currently active
            </p>
          </div>

          <Button
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            onClick={loadAuctions}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-medium">Unable to load auctions</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && auctions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Gavel className="h-7 w-7 text-slate-400" />
            </div>

            <h3 className="font-semibold text-slate-900">
              No live auctions
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              New auctions will appear here when they go live.
            </p>
          </div>
        )}

        {!loading && !error && auctions.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
