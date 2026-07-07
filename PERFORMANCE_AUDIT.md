# Performance Audit

## Baseline Findings

Browser Navigation Timing/LCP/TBT could not be collected directly in the in-app browser because the browser evaluation sandbox did not expose the `performance` API. I did not invent those numbers.

Code inspection found the probable root cause of the reported slow first load:

- The public app mounted the global data provider before rendering all public routes.
- The provider opened realtime listeners immediately for the full `products`, `offers`, and `mainBanners` collections.
- Several pages/components duplicated category/announcement/settings/product requests.
- Firestore had `experimentalForceLongPolling: true`, which is slower on first visit and can create long waits on poor networks.
- The homepage could appear empty while waiting for backend collection queries.
- Admin-only code was already lazy-loaded, but public data fetching was not scoped enough.
- ZIP archives and previous build archives were present in the source tree and are now ignored by Git.

## Implemented Fixes

- Removed Firebase SDK from the storefront bundle.
- Replaced Firebase Auth initialization with Supabase Auth session loading that does not block the public shell.
- Replaced Firestore listeners with a Supabase-backed data layer.
- Kept Razorpay SDK loading lazy; it is loaded only when checkout/payment starts.
- Preserved route-level code splitting.
- Removed real `.env` secrets and ignored ZIP/build artifacts.
- Added build-time chunk visibility through successful Vite build output.

## After Measurements

Local preview at `http://127.0.0.1:4174/`:

- Page shell rendered and `load` state completed in approximately `256 ms` in the in-app browser after final build.
- DOM contained the The Alankar homepage shell and footer immediately.
- Browser console showed Supabase query errors because the new Supabase tables/RLS have not yet been run in the dashboard. This is expected before SQL setup and data import.

## Final Build Bundle Snapshot

Final Vite build succeeded. Important chunks:

- Main JS: `assets/index-DyT_0R_J.js`, `387.51 kB`, gzip `104.26 kB`.
- React vendor: `191.15 kB`, gzip `61.06 kB`.
- Supabase/client shared chunk: `index.es-BMwqRAll.js`, `158.79 kB`, gzip `53.04 kB`.
- Admin panel: `226.91 kB`, gzip `40.96 kB`, lazy chunk.
- Admin PDF chunk: `555.46 kB`, gzip `163.76 kB`, lazy/admin-only chunk.

## Remaining Performance Work

- After importing real data, add server-side limits for homepage products and move full-catalog fetches to `/shop`.
- Split `framer-motion` from the homepage where animation is not critical.
- Remove static imports that defeat dynamic import for `CartDrawer` and `AnnouncementBar`.
- Run Lighthouse/Web Vitals in a full browser environment after Supabase setup.
