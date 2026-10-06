import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { BidEvent } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type BidEventCallback = (event: BidEvent) => void;

export class AuctionWebSocket {
	private client: Client;
	private subscriptions: Map<string, StompSubscription> = new Map();
	private isConnected = false;

	constructor() {
		this.client = new Client({
			webSocketFactory: () => new SockJS(`${WS_URL}/ws`),
			reconnectDelay: 5000,
			heartbeatIncoming: 10000,
			heartbeatOutgoing: 10000,
			debug: (str) => {
				if (process.env.NODE_ENV === "development") {
					// console.log("[WS]", str);
				}
			},
		});

		this.client.onConnect = () => {
			this.isConnected = true;
			// console.log("[WS] Connected");
		};

		this.client.onDisconnect = () => {
			this.isConnected = false;
			// console.log("[WS] Disconnected");
		};

		this.client.onStompError = (frame) => {
			console.error("[WS] STOMP error:", frame.headers.message);
		};
	}

	connect() {
		if (!this.client.active) {
			this.client.activate();
		}
	}

	disconnect() {
		if (this.client.active) {
			this.subscriptions.forEach((sub) => sub.unsubscribe());
			this.subscriptions.clear();
			this.client.deactivate();
		}
	}

	/**
	 * Subscribe to auction topic
	 */
	subscribeToAuction(auctionId: number, callback: BidEventCallback): () => void {
		const topic = `/topic/auctions/${auctionId}`;

		// If already subscribed, just register new callback
		const doSubscribe = () => {
			// Unsubscribe old
			const existing = this.subscriptions.get(topic);
			if (existing) {
				existing.unsubscribe();
			}

			const sub = this.client.subscribe(topic, (msg: IMessage) => {
				try {
					const event: BidEvent = JSON.parse(msg.body);
					callback(event);
				} catch (e) {
					console.error("[WS] Failed to parse event:", e);
				}
			});

			this.subscriptions.set(topic, sub);
		};

		if (this.isConnected) {
			doSubscribe();
		} else {
			// Wait for connection
			const originalOnConnect = this.client.onConnect;
			this.client.onConnect = (frame) => {
				originalOnConnect?.(frame);
				doSubscribe();
			};
			this.connect();
		}

		// Return unsubscribe function
		return () => {
			const sub = this.subscriptions.get(topic);
			if (sub) {
				sub.unsubscribe();
				this.subscriptions.delete(topic);
			}
		};
	}
}

// Singleton
let wsInstance: AuctionWebSocket | null = null;

export function getWebSocket(): AuctionWebSocket {
	if (!wsInstance) {
		wsInstance = new AuctionWebSocket();
	}
	return wsInstance;
}
