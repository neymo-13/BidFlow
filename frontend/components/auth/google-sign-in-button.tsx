"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

// =====================================================
// Google Identity Services (GIS) — only the parts we use
// https://developers.google.com/identity/gsi/web/reference/js-reference
// =====================================================
interface GoogleCredentialResponse {
	credential: string; // ID token (JWT) — the backend verifies it
}

interface GoogleIdConfiguration {
	client_id: string;
	callback: (response: GoogleCredentialResponse) => void;
	ux_mode?: "popup" | "redirect";
}

interface GsiButtonConfiguration {
	type?: "standard" | "icon";
	theme?: "outline" | "filled_blue" | "filled_black";
	size?: "large" | "medium" | "small";
	text?: "signin_with" | "signup_with" | "continue_with" | "signin";
	shape?: "rectangular" | "pill" | "circle" | "square";
	logo_alignment?: "left" | "center";
	width?: number; // px, 200–400
}

interface GoogleAccountsId {
	initialize: (config: GoogleIdConfiguration) => void;
	renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void;
}

declare global {
	interface Window {
		google?: { accounts?: { id?: GoogleAccountsId } };
	}
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

// Public value (not a secret) — inlined at build time, so the dev server must restart after changing it
const CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();

// Without a Client ID the component renders nothing (no divider, no script)
const googleSignInEnabled = CLIENT_ID !== "";

// GIS keeps one configuration per page: initialise once and hand the credential to the button that is mounted now
let initialized = false;
let deliverCredential: ((credential: string) => void) | null = null;

export function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [loadFailed, setLoadFailed] = useState(false);

	// Always call the latest handler without re-rendering Google's button
	const onCredentialRef = useRef(onCredential);
	useEffect(() => {
		onCredentialRef.current = onCredential;
	});

	useEffect(() => {
		const handler = (credential: string) => onCredentialRef.current(credential);
		deliverCredential = handler;
		return () => {
			if (deliverCredential === handler) deliverCredential = null;
		};
	}, []);

	// Runs when the script first loads and again every time this component mounts (e.g. login → register)
	const renderButton = () => {
		const gis = window.google?.accounts?.id;
		const container = containerRef.current;
		if (!gis || !container) return;

		if (!initialized) {
			gis.initialize({
				client_id: CLIENT_ID,
				callback: (response) => deliverCredential?.(response.credential),
				ux_mode: "popup",
			});
			initialized = true;
		}

		gis.renderButton(container, {
			type: "standard",
			theme: "outline",
			size: "large",
			text: "continue_with",
			shape: "rectangular",
			logo_alignment: "left",
			width: Math.min(400, Math.max(200, container.clientWidth)),
		});
	};

	if (!googleSignInEnabled) return null;

	return (
		<div className="w-full space-y-4">
			<div className="flex items-center gap-3 text-xs text-slate-400">
				<span className="h-px flex-1 bg-slate-200" />
				or
				<span className="h-px flex-1 bg-slate-200" />
			</div>
			<Script src={GIS_SRC} strategy="afterInteractive" onReady={renderButton} onError={() => setLoadFailed(true)} />
			{/* Google renders its own button (an iframe) into this element */}
			<div ref={containerRef} className="flex min-h-10 w-full justify-center" />
			{loadFailed && (
				<p className="text-center text-sm text-slate-500">
					Google sign-in couldn&apos;t load. Check your connection or use your username and password.
				</p>
			)}
		</div>
	);
}
