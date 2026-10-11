# Peppsbite

Fast, fresh grocery delivery app — Vite + React storefront with a Paystack
checkout and a small Express backend that verifies payments.

- `src/` — the storefront (hash routing, no router dependency)
- `server/` — the Paystack API, used by `npm run server` and by tests
- `api/` — the same API as a single Vercel function (see [Deploying](#deploying-to-vercel))
- `tests/` — payment API tests, `npm test`

## Local development

```bash
npm install
cp .env.example .env      # fill in your Paystack keys
npm run dev:all           # storefront on :3000, Paystack API on :3001
```

Open <http://localhost:3000> and check that the API answered:

```bash
curl http://localhost:3000/api/health
```

`npm run dev:all` runs both processes; the browser only ever talks to the Vite
dev server, which proxies `/api/*` to `http://127.0.0.1:3001` (see
`vite.config.ts`). `npm run dev` alone gives you the storefront without the
payment API.

Get keys from <https://dashboard.paystack.co/#/settings/developer>:

| Variable | Where it lives | Notes |
| --- | --- | --- |
| `VITE_PAYSTACK_PUBLIC_KEY` | browser bundle | `pk_test_…` / `pk_live_…`. Inlined at build time. |
| `PAYSTACK_SECRET_KEY` | server only | `sk_test_…` / `sk_live_…`. Never prefix with `VITE_`. |
| `PAYSTACK_API_BASE` | server only | Optional; defaults to `https://api.paystack.co`. |

## How a payment works

1. Checkout asks the API to record how much this order should cost
   (`POST /api/paystack/initialize`) and creates the order as **pending**.
2. `PaystackPop.setup(...).openIframe()` opens Paystack's hosted checkout with
   that amount and reference. The popup only needs the public key.
3. The popup's `callback` fires when the customer *returns* — that is not proof
   of payment.
4. The browser calls `POST /api/paystack/verify`; the server asks Paystack
   (`GET /transaction/verify/:reference`) with the secret key, cross-checks the
   paid amount against the recorded intent, and only then is the order marked
   paid.
5. Independently, Paystack POSTs `charge.success` to
   `/api/paystack/webhook`, which is signature-checked against the raw request
   bytes and settles the order even if the browser never came back.

Payment is never blocked by a missing backend: if the API is unreachable the
popup still opens (step 2 only needs the public key), the order stays pending
and the webhook reconciles it later.

## Deploying to Vercel

The storefront is a static Vite build; the API is one serverless function.

1. Import the repository at <https://vercel.com/new>. Vercel detects Vite
   (`npm run build` → `dist`) and turns `api/index.ts` into a function. If the
   preset is not Vite, set Build Command `npm run build` and Output Directory
   `dist` by hand.
2. Add the environment variables above under
   **Settings → Environment Variables**:
   - `VITE_PAYSTACK_PUBLIC_KEY` — needs **Production + Preview + Development**.
     Vite inlines it during the build, so set it *before* deploying and
     **redeploy after changing it**.
   - `PAYSTACK_SECRET_KEY` — server-side, read per request, so adding it later
     works without a rebuild.
3. Deploy, then confirm the function is live:

   ```
   https://<your-app>.vercel.app/api/health
   ```

   It should answer `{"ok":true,...,"secretKeyConfigured":true,"mode":"test",...}`.
4. In Paystack, **Settings → API Keys & Webhooks → Webhook URL**, set:

   ```
   https://<your-app>.vercel.app/api/paystack/webhook
   ```

5. Test a payment with Paystack's test card: `4084 0840 8408 4081`, any future
   expiry, CVV `408`, PIN `0000`, OTP `123456`. Then check the order shows
   "Paid" and that `https://<your-app>.vercel.app/api/paystack/payments/<reference>`
   reports `"status":"paid"`.

### How the API is wired on Vercel

Vercel treats each file in `api/` as a separate function, and separate
functions do not share memory. Since `/verify` must find the payment intent
`/initialize` created, **all routes live in the single file `api/index.ts`**,
which exports the Express app from `server/`. `vercel.json` rewrites every
`/api/*` path into that file and passes the original path in a query param;
`server/index.ts` puts it back on `req.url` before routing.

Two consequences worth knowing:

- The payment records live in memory (`server/payments.ts`), which suits one
  function on Fluid compute but is still best-effort: a cold start loses them.
  If `/verify` runs with no matching intent it trusts Paystack's answer and
  reports `"crossChecked": false` rather than calling a real payment unverified.
  Swap `PaymentStore` for Redis or a database before real traffic.
- `vercel.json` also rewrites unknown paths to `index.html` so deep links work.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:all` | Storefront + Paystack API together |
| `npm run dev` | Storefront only (`vite`, port 3000) |
| `npm run server` | Paystack API only (`tsx watch server/main.ts`, port 3001) |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | `tsc --noEmit` |
| `npm test` | Payment API tests (Paystack is stubbed, offline) |

## Troubleshooting

**"Could not start the payment (HTTP 404)"** — nothing is serving `/api/*`.
Open `/api/health` on the deployed site: the JSON echoes the URL the function
received, which is enough to tell an undeployed function from a rewrite that
did not match. On a fresh deployment this means the `api/` directory was added
after the last build — push and redeploy.

**"…continuing without server-side verification"** — the storefront could not
reach the API at all: `/api/paystack/initialize` answered 404 or 5xx, so the
reference is generated in the browser and nothing will confirm the charge. The
customer can still pay; the order stays pending until the webhook settles it.

**Order still pending after paying** — the charge succeeded but nothing
confirmed it. Either `PAYSTACK_SECRET_KEY` is missing on the server (`/verify`
answers 503 and webhook signatures cannot be checked), or the webhook URL is
not set in the Paystack dashboard. Check
`/api/paystack/payments/<reference>`: `paid` means it settled late, `failed`
means the paid amount did not match the order total, `pending` means neither
`/verify` nor the webhook has run yet.
