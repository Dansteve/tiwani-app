# tiwani-app

The TIWANI Coordinator product: the app a family member or carer uses to **prepare** an activity, **adapt** when it gets hard, and **keep someone participating** in everyday life. It is the mobile-first Progressive Web App half of TIWANI, the Life Continuity Platform for additional-needs caregiving.

The app is a **thin client over [`tiwani-api`](https://github.com/Dansteve/tiwani-api)**. It owns the brand, the screens, and the experience (the under-two-minute onboarding, the two-tap Pulse, the one-tap Continuity Card share), but it holds **no scoring or index logic**. Every pressure score, participation tier, Life Continuity Index value, trajectory, and Erosion Alert is computed by the api and **rendered as received**. If a number is wrong, it is fixed in the api, never recomputed here.

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**, built as a static export (`output: 'export'`).
- **Tailwind v4** + **shadcn/ui** (Radix primitives) on the **Blackbird** design system approach, with the TIWANI brand tokens (Deep Teal / Coral / Warm Grey) in `src/styles/theme.css` and the **Inter** typeface. Every colour resolves to a brand token; there is no off-palette hex and no Blackbird accent blue.
- **TanStack Query** for server state.
- **Supabase Auth SDK** for identity (email + Google). No credential is ever stored, hashed, or compared on the client.

## Backends

The app talks to two backends only:

- **`tiwani-api`** for everything except identity, through the single typed client in `src/lib/api/client.ts`. Endpoints mirror the api contract under **`/api/v1`**; the base URL comes from `NEXT_PUBLIC_API_URL`. No component calls `fetch` or builds its own URL; reads are `useQuery`, mutations are `useMutation`, and the Supabase session token is attached by the client.
- **Supabase Auth** for sign-in / sign-up.

The app renders the api's engine output and its governed Alert copy **verbatim**; it never re-derives a score, re-applies a multiplier, recomputes the index, or authors Alert wording.

## Progressive Web App

The app is **installable** (`public/manifest.webmanifest`, `display: standalone`) and registers a service worker (`public/sw.js`) so its shell loads fast and still loads offline. The Life Continuity Engine is **server-side**, so preparing a plan, scoring, and syncing all need a connection: when the device drops offline an `OfflineBanner` shows a calm message that planning runs on the servers (`src/components/OfflineBanner.tsx`).

## Deployment

Deployed to **Firebase Hosting** (Firebase project **`app-tiwani`**). `npm run build` produces the static site in `out/`, which Firebase serves (`firebase.json`). The `deploy` script builds with the production api / website URLs and runs `firebase deploy`.

## Source layout

```
src/
  app/          Next.js App Router: route segments + layouts (the shell)
  features/     feature-first; each owns { its screen, components, hooks }
  components/   shared only: ui/ (primitives) + brand widgets (ChapterCard, ScoreBadge, ...)
  lib/          the typed api client (api/), the Supabase client, format helpers, env
  state/        session/auth context, the selected-recipient context (RecipientProvider), UI prefs
  styles/       theme.css (brand tokens), fonts
public/         PWA manifest, icons, service worker
```

## Commands

Run from the repo root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Static-export build to `out/` |
| `npm run start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Strict `tsc --noEmit` |
| `npm run test` | Vitest (run once) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run deploy` | Production build, then `firebase deploy` to `app-tiwani` |

Tests use **Vitest** + **React Testing Library** + jsdom. Pure logic (the onboarding state machine, `src/lib/format.ts`, filters) carries co-located tests; screens that render engine output get a test that they display exactly what the api returned and never recompute it.

### Environment

Copy `.env.example` to `.env.local` and fill in. All keys are `NEXT_PUBLIC_*` because the app is a static client read in the browser:

- `NEXT_PUBLIC_API_URL`: base URL of `tiwani-api`, no trailing slash (dev example `http://localhost:8002`).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the Supabase project (Auth + the api's data layer).
- `NEXT_PUBLIC_WEBSITE_URL`: the marketing site the app links "Back to home" to.

## Documentation

The governed docs are the source of truth; read them before changing app code:

- **App architecture, patterns, hard rules, and the module routing table:** `governance/HardRules/App/SETUP.md`, then its per-area files in `governance/HardRules/App/Modules/` (Onboarding, Dashboard, Plan, Card, Pulse, Continuity, Services, Lib, Settings).
- **The brand system** (colours, usage, the shared type scale): `governance/Docs/Brand.md`.
- **The product definition** (the PRD; the LCE, LCI, and Erosion Alerts are authoritative): `governance/Docs/Product.md`.
- **Workspace rules and routing:** the root `CLAUDE.md`.
