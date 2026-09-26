import Link from "next/link";
import { Gavel, Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AuctionSummary } from "@/lib/types";
import { formatCurrency, timeRemaining } from "@/lib/format";

export function AuctionCard({
  auction,
}: {
  auction: AuctionSummary;
}) {
  const isActive = auction.status === "ACTIVE";
  const isEnded = auction.status === "ENDED";

  return (
    <Link href={`/auctions/${auction.id}`} className="group block">
      <Card className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm transition-all duration-300 hover:shadow-xl">
        {/* Visual area with image */}
        <div className="relative overflow-hidden bg-slate-100">
          <div className="relative h-48 w-full overflow-hidden">
            <img
              src={`https://picsum.photos/seed/${auction.id}/500/350`}
              alt={auction.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Status */}
          <div className="absolute right-3 top-3">
            <StatusBadge status={auction.status} />
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="mb-1 text-xs font-medium text-slate-400">@{auction.sellerUsername}</p>

          <h3 className="line-clamp-2 min-h-[48px] text-base font-semibold leading-6 text-slate-900 transition-colors group-hover:text-blue-600">
            {auction.title}
          </h3>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current bid</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(auction.currentPrice)}</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Bids</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">{auction.totalBids}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            {isActive && (
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  Ends in
                </p>

                <p className="mt-0.5 text-sm font-semibold text-orange-600">{timeRemaining(auction.endTime)}</p>
              </div>
            )}

            {isEnded && (
              <div className="mt-0 rounded-lg bg-slate-100 py-2 px-3 text-center text-xs font-medium text-slate-500">Auction ended</div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white/95 px-2.5 py-1 text-xs font-semibold text-emerald-600 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live
      </div>
    );
  }

  if (status === "ENDED") {
    return (
      <div className="rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm">
        Ended
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="rounded-full border border-red-100 bg-white/95 px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm">
        Cancelled
      </div>
    );
  }

  return (
    <div className="rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm">
      {status}
    </div>
  );
}