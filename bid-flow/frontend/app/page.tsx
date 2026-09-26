"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auctionApi } from "@/lib/api";
import { AuctionSummary } from "@/lib/types";
import { getErrorMessage } from "@/lib/http";

export default function Home() {
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auctionApi.list();
      setAuctions(res.content);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>API Client Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testApi} disabled={loading}>
            {loading ? "Loading..." : "Test API Call"}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded">
              Error: {error}
            </div>
          )}

          {auctions.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold">Auctions ({auctions.length}):</p>
              {auctions.map((a) => (
                <div key={a.id} className="p-3 border rounded">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-gray-600">
                    ฿{a.currentPrice} — {a.status}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && auctions.length === 0 && (
            <p className="text-gray-500 text-sm">
              Click the button to test API
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}