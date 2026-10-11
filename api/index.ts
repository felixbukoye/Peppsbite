/**
 * Vercel entry point for the Peppsbite Paystack API.
 *
 * Vercel turns every file in `/api` into a function. All of our routes
 * (`/api/health`, `/api/paystack/initialize`, `/api/paystack/verify`,
 * `/api/paystack/webhook`, `/api/paystack/payments/:reference`) live in this
 * one file on purpose:
 *
 *   - One function = one warm instance, so the in-memory PaymentStore is
 *     shared by every route. Split the routes into separate files and
 *     `/verify` would run in a different container than `/initialize` and
 *     never find the payment it is supposed to check.
 *   - Fewer, larger functions also start faster on Fluid compute.
 *
 * `vercel.json` rewrites `/api/<anything>` to `/api/index` and passes the
 * original path along in the `__vpath` query param; `server/index.ts` puts it
 * back on `req.url` before Express sees the request.
 *
 * The whole Express app is exported directly, which is what Vercel looks for
 * (see "Using Express.js with Vercel"). Bodies stay untouched - Vercel skips
 * its own body parser for request listeners that already expose `.listen` -
 * so `express.raw()` still receives the exact bytes Paystack signed.
 *
 * Env vars used here are read per request from `process.env`, so the ones set
 * in the Vercel dashboard just work:
 *   PAYSTACK_SECRET_KEY   sk_test_... / sk_live_...   (server-side only)
 *   PAYSTACK_API_BASE     optional override, defaults to https://api.paystack.co
 */
import { createApp } from "../server/index.js";

const { app } = createApp();

export default app;
