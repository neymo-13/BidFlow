"use client";

import { useEffect, useRef, useState } from "react";
import { BidEvent } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";

export function useAuctionWebSocket(
  auctionId: number | null,
  onEvent: (event: BidEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onEvent);

  // Keep callback fresh
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!auctionId) return;

    const ws = getWebSocket();
    ws.connect();
    setIsConnected(true);

    const unsubscribe = ws.subscribeToAuction(auctionId, (event) => {
      callbackRef.current(event);
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [auctionId]);

  return { isConnected };
}
