# ReturnLedger

ReturnLedger is a privacy-first reconciliation tool for small wholesalers, distributors, and other stock-based businesses. It compares a return shipment/claim CSV with a later supplier credit memo CSV, groups matching SKU/ISBN lines, and flags discrepancies.

The MVP is a static React application: CSV files never leave the browser, and the deterministic core requires no API key, account, backend, or paid AI service.

**Live demo:** <https://capekk23.github.io/return-ledger/>

## Features

- Interactive landing page and working sample reconciliation
- Drag-and-drop or file-picker CSV import
- Automatic suggestions plus flexible column mapping
- SKU, ISBN, EAN, UPC, or arbitrary item-code matching
- Duplicate-line aggregation and identifier normalization
- Matched, missing, under-credited, over-credited, and unmatched classifications
- Exception-value summary, filters, and CSV export
- Comma, semicolon, and tab-delimited input; quoted cell support
- Responsive, keyboard-accessible UI with reduced-motion support
- Production Docker image with Nginx and security headers
- Core and UI automated tests

## How matching works

1. Identifiers are trimmed, uppercased, and stripped of spaces and hyphens.
2. Duplicate rows for a normalized identifier are aggregated.
3. Quantities and amounts are treated as absolute values so negative-format credit memos still compare correctly.
4. A line in the claim only is **missing**; a line in the memo only is **unmatched**.
5. For an item in both files, the amount difference determines under/over status when it exceeds the €0.01 tolerance. If the amount matches, quantity determines the status. This amount-first rule makes conflicting quantity/amount signals deterministic.
6. Identical totals are **matched**.

The MVP expects line totals rather than unit prices. Currency conversion, tax normalization, fuzzy product matching, saved mapping templates, user accounts, and payment collection are intentionally out of scope.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173>).

## Test and build

```bash
npm test
npm run build
```

Preview the production bundle:

```bash
npm run preview -- --host 0.0.0.0
```

## Docker deployment

```bash
docker build -t return-ledger .
docker run --rm -p 8080:80 return-ledger
```

Then open <http://localhost:8080>.

### Coolify

1. Create a new **Application** from this Git repository.
2. Select **Dockerfile** as the build pack; the Dockerfile location is `/Dockerfile`.
3. Set the container port to `80` and attach the desired domain.
4. No environment variables, volume, database, or health-check override are needed.
5. Deploy and verify that the page and CSV demo load over HTTPS.

### Other static hosts

Run `npm ci && npm run build` and publish `dist/`. The default build uses `/return-ledger/` as its asset base for GitHub Pages. Set `base` in `vite.config.ts` to `/` when deploying at the root of a custom domain. No runtime secrets are required.

### GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys `main` automatically. In repository **Settings → Pages**, select **GitHub Actions** as the source. The deployment is available at <https://capekk23.github.io/return-ledger/>.

## Privacy and AI

The app makes no network request for CSV processing and contains no analytics or third-party fonts. The reconciliation engine is deliberately deterministic. An AI explanation layer is a possible future opt-in enhancement, but AI is not involved in matching or required to run this MVP.

## Sample data

- [`public/samples/return-claim.csv`](public/samples/return-claim.csv)
- [`public/samples/supplier-credit.csv`](public/samples/supplier-credit.csv)

Both are compiled into the live demo and are also directly downloadable from `/samples/` in a deployed build.
