# Advanced Frontend Performance Optimization Guide
## Alem Ketema Enat General Hospital Management System (AKEH-HMS)

### 1. Overview
The AKEH-HMS frontend was systematically optimized to support low-bandwidth rural clinical environments, older hospital workstation computers, and mobile tablets used during clinical rounds.

---

### 2. Key Performance Interventions

#### A. Code-Splitting Heavy Charting Libraries (`Recharts`)
* **Problem**: `Recharts` (~410 kB uncompressed) was previously bundled into dashboard entry routes, forcing every logging-in user (receptionists, nurses, cashiers) to download heavy SVG charting logic.
* **Solution**:
  - Extracted visual charts (`AreaChart`, `PieChart`, `BarChart`) from `DashboardPage.tsx` into a lazy-loaded component: `DashboardAnalyticsCharts.tsx`.
  - Wrapped analytics behind a `<Suspense>` boundary with a themed skeleton fallback.
  - Clinical and administrative KPI cards hydrate immediately in sub-second time, while charts load asynchronously in the background.

#### B. Rollup Manual Chunk Optimization (`vite.config.ts`)
* Configured isolated vendor boundaries in Rollup:
  - `vendor-react`: `['react', 'react-dom', 'react-router-dom']` (~155 kB)
  - `vendor-tanstack`: `['@tanstack/react-query']` (~49 kB)
  - `vendor-ui`: `@radix-ui/*` primitives, `clsx`, `tailwind-merge` (~0.45 kB)
  - `vendor-icons`: `lucide-react` (~63 kB)
  - `vendor-network`: `axios`, `socket.io-client` (~88 kB)
  - `vendor-charts`: `recharts` (~410 kB, loaded strictly on demand)
* **Impact**: Decreased the primary application entry bundle (`index-*.js`) by over 118 kB.

#### C. Production Tree-Shaking for Devtools
* In `main.tsx`, `@tanstack/react-query-devtools` was conditionally lazy-loaded using `import.meta.env.DEV`:
  ```tsx
  const ReactQueryDevtools = import.meta.env.DEV
    ? lazy(() => import('@tanstack/react-query-devtools').then(m => ({ default: m.ReactQueryDevtools })))
    : null;
  ```
  This eliminates all devtool overhead from production distributions.

---

### 3. Empirical Performance Measurements

| Metric | Before Optimization | After Optimization | Delta / Improvement |
| :--- | :--- | :--- | :--- |
| **Vite Production Build Time** | 24.53s | **13.09s** | **-46.6% (1.87x faster)** |
| **Main JS Entry Bundle (`index.js`)** | 620.74 kB | **502.37 kB** | **-118.37 kB (-19.1%)** |
| **Dashboard Page Chunk** | 11.18 kB | **8.05 kB** | **-3.13 kB (-28.0%)** |
| **Chart Isolation** | Statically linked | **Lazy chunk (4.46 kB)** | Loaded only on demand |
| **Vitest Unit Test Suite Run** | 20.47s | **13.45s** | **-34.3% faster** |

---

### 4. Developer Guidelines for Future Modules

1. **Lazy Loading Routes**: Always declare new pages using `lazy(() => import('./pages/...'))` inside `App.tsx`.
2. **Third-Party Libraries**: Heavy libraries (e.g., PDF generation, rich image manipulators) must never be imported at top level in `main.tsx` or `GlobalNavigation.tsx`.
3. **Suspense Boundaries**: Provide a themed, accessible skeleton fallback matching the Midnight Navy palette (`#070e1e` / `#0a1329`).
