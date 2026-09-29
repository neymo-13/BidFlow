# BidFlow Frontend

Next.js 16 (App Router) client for BidFlow, a real-time auction platform. It talks to the Spring Boot backend in `../backend` over REST (JWT) and STOMP/SockJS WebSocket.

## Prerequisites

- Node.js 20.9+ (tested with 22)
- The backend running (see `../backend/README.md` or `docker compose up` from the repo root)

## Setup

```bash
cd frontend
npm ci
cp .env.example .env.local   # then edit NEXT_PUBLIC_API_URL if needed
npm run dev
```

Open <http://localhost:3000>.

> **Port 3000 is required in development.** The backend CORS config only allows `http://localhost:3000` and `http://127.0.0.1:3000`. If Next.js falls back to 3001 because 3000 is busy, API calls will fail with CORS errors — free port 3000 first.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend base URL for REST and WebSocket |

Seeded demo accounts (created by the backend on first start): `alice`, `bob`, `charlie` — password `password123`. `bob` owns all seeded auctions.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next build` no longer runs lint in Next.js 16) |
| `npx tsc --noEmit` | Type-check only |

## Pages

| Route | Login | Description |
|---|---|---|
| `/` | — | Home with live auctions |
| `/auctions` | — | Browse auctions — Live / Ended tabs, keyword search, sort, pagination (`?status=ACTIVE\|ENDED&q=...&sort=newest\|endingSoon\|priceAsc\|priceDesc\|mostBids&page=N`) |
| `/auctions/[id]` | — | Auction detail — photo gallery, real-time bidding, "Starts in" before bidding opens. The seller also sees their own drafts here (Edit / Publish) |
| `/auctions/create` | ✓ | Create an auction (saved as **Draft**) with up to 5 photos |
| `/auctions/my` | ✓ | Seller dashboard — filter by status, publish / edit / cancel drafts |
| `/auctions/[id]/edit` | ✓ | Edit a draft (only changed fields are sent), add / remove photos, publish |
| `/bids` | ✓ | My Bids — one row per auction with Leading / Outbid / Won / Lost |
| `/wallet` | ✓ | Balance, deposit, withdraw, transaction history |
| `/notifications` | ✓ | All notifications, mark as read |
| `/profile` | ✓ | Account details and quick links |
| `/login`, `/register` | — | Authentication |

The navbar bell polls the latest 20 notifications every 30 seconds (paused while the tab is hidden) and shows the unread count.

## Project structure

```text
app/                     Routes (all pages are client components; the JWT lives in localStorage)
components/
  auth/auth-guard.tsx    <RequireAuth> — redirects to /login?redirect=... (UX only; backend enforces auth)
  auction/               AuctionCard, AuctionThumb, StatusBadge, AuctionForm (create/edit),
                         PublishAuctionDialog, ImagePicker / AuctionImageManager (photos)
  common/pagination.tsx
  notification/          NotificationBell
  layout/                Navbar, MainLayout
  ui/                    shadcn/ui components (base-ui)
lib/
  api/                   Axios API clients per resource
  http.ts                Axios instance, JWT + 401 interceptors, error helper
  hooks/use-fetch.ts     Data loading hook (stale-response safe)
  hooks/use-auth.ts      Auth init / guards
  store/                 Zustand stores (auth, notifications)
  auction-form.ts        Auction form validation + payload builder
  image-file.ts          Photo checks before upload (type, 5 MB, max 5) — the API re-checks the real content
  redirect.ts            safeRedirect() — blocks open redirects in ?redirect=
  format.ts              Currency / date / countdown helpers
```

## Photos

Photos are uploaded to the backend (`multipart/form-data`), which stores them in S3-compatible object storage. Image URLs in API responses are **presigned and expire after 60 minutes** — never store them; reload the data to get fresh URLs. Photos can only be changed while an auction is a draft.

## Known limitations

- The unread badge counts the latest 20 notifications only (there is no unread-count endpoint).
- Countdown texts ("2h 5m left", "Starts in …") don't tick; they update when the page reloads its data.
- A page left open for more than 60 minutes shows broken photos until it is refreshed (presigned URLs expire).

## Troubleshooting

- **Requests to `http://localhost:8081` hang on Windows (Docker Desktop + WSL)** while `http://127.0.0.1:8081` works: `localhost` resolves to `::1`, which goes through a WSL port relay that can get stuck. Restart Docker Desktop, or point `NEXT_PUBLIC_API_URL` at `http://127.0.0.1:<port>`.
