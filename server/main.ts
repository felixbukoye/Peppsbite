/**
 * Starts the Paystack backend.
 *
 *   npm run server
 *
 * Env:
 *   PAYSTACK_SECRET_KEY  required for /verify and /webhook (sk_test_... / sk_live_...)
 *   PORT                 defaults to 3001
 *   HOST                 defaults to 0.0.0.0 so the Vite dev proxy can reach it
 *   PAYSTACK_API_BASE    override for tests; defaults to https://api.paystack.co
 */
import "dotenv/config";
import { createApp } from "./index.js";
import { isSecretKey, keyMode } from "./paystack.js";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

const { app, secretKey } = createApp();

const key = secretKey();
if (!isSecretKey(key)) {
  console.warn(
    "[paystack] PAYSTACK_SECRET_KEY is not set.\n" +
      "[paystack] /initialize and /payments work, but /verify and /webhook will return 503.\n" +
      "[paystack] Add it to .env (never with a VITE_ prefix - that would ship it to the browser).",
  );
} else {
  const mode = keyMode(key);
  console.log(`[paystack] using ${mode} secret key`);
  if (mode === "live") {
    console.warn("[paystack] LIVE MODE - real money will move.");
  }
}

app.listen(port, host, () => {
  console.log(`[paystack] listening on http://${host}:${port}`);
});
