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
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | the team's Client ID in `.env.example` | Google OAuth Client ID. Empty = no "Continue with Google" button. See [Google sign-in](#google-sign-in) |

`NEXT_PUBLIC_*` values are inlined when the app is built — restart `npm run dev` after changing them.

Seeded demo accounts (created by the backend on first start): `alice`, `bob`, `charlie` — password `password123`. `bob` owns all seeded auctions. None of them is an admin — see [Admin](#admin).

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
| `/auctions` | — | Browse auctions — Live / Ended tabs, category, keyword search, sort, pagination (`?status=ACTIVE\|ENDED&category=<slug>&q=...&sort=newest\|endingSoon\|priceAsc\|priceDesc\|mostBids&page=N`). An unknown category slug is ignored (all categories) |
| `/auctions/[id]` | — | Auction detail — category badge (links to the filtered list), photo gallery, real-time bidding, "Starts in" before bidding opens. The seller also sees their own drafts here (Edit / Publish) |
| `/auctions/create` | ✓ | Create an auction (saved as **Draft**) with a required category and up to 5 photos |
| `/auctions/my` | ✓ | Seller dashboard — filter by status, publish / edit / cancel drafts |
| `/auctions/[id]/edit` | ✓ | Edit a draft (only changed fields are sent), change the category (a category hidden meanwhile shows as "(hidden)" and can be kept), add / remove photos, publish |
| `/bids` | ✓ | My Bids — one row per auction with Leading / Outbid / Won / Lost |
| `/wallet` | ✓ | Balance, deposit, withdraw, transaction history |
| `/notifications` | ✓ | All notifications, mark as read |
| `/profile` | ✓ | Account details and quick links |
| `/login`, `/register` | — | Authentication — username / password, plus "Continue with Google" when configured |
| `/admin` | admin | Dashboard — users, auctions per status, bids, total sales (cards link to the filtered lists) |
| `/admin/users` | admin | Search users, Admin / Suspended / Google badges, suspend / unsuspend (admins can't be suspended) |
| `/admin/auctions` | admin | Every auction of every status (`?status=&q=&page=`), cancel a draft / live auction with a reason (the leading bid is refunded, seller and bidders are notified) |
| `/admin/categories` | admin | Add, rename, hide / show, delete unused categories (`Other` can't be hidden or deleted) |

`/admin/*` pages: not logged in → login; logged in without the admin role → "You don't have access to this page". This is UX only — the backend checks the role on every `/api/admin` request.

The navbar bell polls the latest 20 notifications every 30 seconds (paused while the tab is hidden) and shows the unread count.

## Project structure

```text
app/                     Routes (all pages are client components; the JWT lives in localStorage)
components/
  auth/auth-guard.tsx    <RequireAuth> — redirects to /login?redirect=... · <RequireAdmin> for /admin
                         (UX only; backend enforces auth and roles)
  auth/google-sign-in-button.tsx  "Continue with Google" (Google Identity Services, loaded with next/script)
  admin/                 AdminNav (tabs), CancelAuctionDialog
  auction/               AuctionCard, AuctionThumb, StatusBadge, AuctionForm (create/edit),
                         PublishAuctionDialog, ImagePicker / AuctionImageManager (photos)
  common/pagination.tsx
  notification/          NotificationBell
  layout/                Navbar, MainLayout
  ui/                    shadcn/ui components (base-ui)
lib/
  api/                   Axios API clients per resource (incl. category.ts, admin.ts)
  http.ts                Axios instance, JWT + 401 interceptors, error helper
  hooks/use-fetch.ts     Data loading hook (stale-response safe, `enabled` to wait for something first)
  hooks/use-categories.ts Visible categories (form + filter)
  hooks/use-auth.ts      Auth init / guards
  store/                 Zustand stores (auth, notifications)
  auction-form.ts        Auction form validation + payload builder
  image-file.ts          Photo checks before upload (type, 5 MB, max 5) — the API re-checks the real content
  redirect.ts            safeRedirect() — blocks open redirects in ?redirect=
  format.ts              Currency / date / countdown helpers
```

## Photos

Photos are uploaded to the backend (`multipart/form-data`), which stores them in S3-compatible object storage. Image URLs in API responses are **presigned and expire after 60 minutes** — never store them; reload the data to get fresh URLs. Photos can only be changed while an auction is a draft.

## Admin

There is no sign-up for admins. The backend creates (or promotes) the first admin from environment variables:

1. At the repository root: `cp .env.example .env`, then set `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (≥ 8 characters). `.env` is gitignored.
2. `docker compose up -d backend` (add `-f docker-compose.yml -f docker-compose.local.yml` if you use port overrides).
3. Log in as that user — the account menu shows **Admin**.

If the username already exists, that account becomes an admin (its password is unchanged). Removing the env values later doesn't demote anyone; use SQL for that (see `../backend/README.md`). A role change shows in the UI after a page reload; the API applies it immediately.

## Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → **Create credentials → OAuth client ID** → type **Web application**.
2. **Authorized JavaScript origins:** `http://localhost:3000` and `http://localhost` (no redirect URI needed — the button uses a popup).
3. Put the Client ID in **both** places (same value; it is not a secret):
   - `frontend/.env.local` → `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...` → restart `npm run dev`
   - root `.env` → `GOOGLE_CLIENT_ID=...` → `docker compose up -d backend`
4. Open the app at `http://localhost:3000` (not `127.0.0.1` — that origin isn't registered with Google).

"Continue with Google" signs into the account that already uses that Google account or email, or creates a new account (username from the email, ฿10,000 welcome balance, no password — such an account can only sign in with Google). Errors show like a normal login: `Google sign-in is not configured` = the backend has no `GOOGLE_CLIENT_ID`; `Invalid Google credential` = usually different Client IDs in frontend and backend; `Account suspended`.

## Known limitations

- The unread badge counts the latest 20 notifications only (there is no unread-count endpoint).
- Countdown texts ("2h 5m left", "Starts in …") don't tick; they update when the page reloads its data.
- A page left open for more than 60 minutes shows broken photos until it is refreshed (presigned URLs expire).
- Google sign-in links to an existing account by email. Because password sign-up doesn't verify emails, someone who registered first with another person's email would share that account when the real owner uses Google (accepted risk — see `../backend/README.md`).
- If an admin loses the admin role while an admin page is open, actions there fail with "Request failed with status code 403" until the page is reloaded.

## Troubleshooting

- **Requests to `http://localhost:8081` hang on Windows (Docker Desktop + WSL)** while `http://127.0.0.1:8081` works: `localhost` resolves to `::1`, which goes through a WSL port relay that can get stuck. Restart Docker Desktop, or point `NEXT_PUBLIC_API_URL` at `http://127.0.0.1:<port>`.
