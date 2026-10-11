/**
 * Paystack backend for Peppsbite.
 *
 *   POST /api/paystack/initialize   create a pending payment intent
 *   POST /api/paystack/verify       confirm a reference against Paystack
 *   POST /api/paystack/webhook      receive signed Paystack events
 *   GET  /api/paystack/payments/:reference   poll a payment's status
 *   GET  /api/health                config sanity check
 *
 * The webhook route is registered BEFORE express.json() so its handler sees
 * the raw request bytes - Paystack's signature is an HMAC over those exact
 * bytes and re-serialising parsed JSON will not reproduce them.
 */
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import crypto from "node:crypto";
import {
  PaystackApiError,
  isSecretKey,
  isValidSignature,
  keyMode,
  verifyReference,
} from "./paystack.js";
import { PaymentStore, store as sharedStore } from "./payments.js";

/**
 * The Vercel deployment funnels every `/api/*` path into a single function
 * file by rewriting to `/api/index` and handing the original path over as a
 * query param (see `vercel.json`). Depending on how the rewrite is matched the
 * captured path shows up as `__vpath` (substituted into our destination) or as
 * `path` (Vercel's own capture forwarding) - accept either.
 *
 * These names are an internal detail of the deployment, never part of the
 * public API, and are absent when the pretty URL arrives intact (`npm run dev`,
 * any host that serves the Express app directly).
 */
const REWRITE_PATH_PARAMS = ["__vpath", "path"];

/** Paths the rewrite above can land on before routing. */
function isFunctionRoot(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return normalized === "/api" || normalized === "/api/index";
}

/**
 * Puts the original path back on `req.url`.
 *
 * Without this every request arrives as `/api/index?__vpath=...` and Express
 * would 404 on routes it clearly has. Runs before any parsing or routing.
 */
function restoreRewrittenPath(req: Request, _res: Response, next: NextFunction): void {
  const url = req.url ?? "/";
  const queryIndex = url.indexOf("?");
  const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);

  // Remember what actually arrived so /api/health and the 404 handler can
  // report it - that is what makes a misrouted deployment diagnosable.
  (req as Request & { incomingUrl?: string }).incomingUrl = url;

  if (!isFunctionRoot(pathname)) {
    next();
    return;
  }

  const params = new URLSearchParams(queryIndex === -1 ? "" : url.slice(queryIndex + 1));
  const vpath = REWRITE_PATH_PARAMS.map((name) => params.get(name)).find((value) => !!value);

  if (!vpath) {
    next();
    return;
  }

  for (const name of REWRITE_PATH_PARAMS) {
    params.delete(name);
  }

  const query = params.toString();
  req.url = `/api/${vpath.replace(/^\/+/, "")}${query ? `?${query}` : ""}`;
  next();
}

export type AppOptions = {
  secretKey?: string;
  store?: PaymentStore;
};

export type AppDeps = {
  app: Express;
  store: PaymentStore;
  secretKey: () => string | undefined;
};

function newReference(): string {
  return `pepps_${crypto.randomBytes(12).toString("hex")}`;
}

export function createApp(options: AppOptions = {}): AppDeps {
  const payments = options.store ?? sharedStore;
  // Read per-request so a key loaded later (dotenv ordering, tests) is picked up.
  const secretKey = () => options.secretKey ?? process.env.PAYSTACK_SECRET_KEY;

  const app = express();
  app.disable("x-powered-by");

  // Undo the production rewrite (must run before any parsing or routing).
  app.use(restoreRewrittenPath);

  // ---------------------------------------------------------------- webhook
  // Raw body parser, scoped to this route only.
  app.post(
    "/api/paystack/webhook",
    express.raw({ type: "*/*", limit: "1mb" }),
    (req: Request, res: Response) => {
      const key = secretKey();
      if (!isSecretKey(key)) {
        // Without a secret we cannot authenticate the caller. Never trust an
        // unsigned webhook - an attacker could mark any order paid.
        res.status(503).json({ error: "PAYSTACK_SECRET_KEY is not configured" });
        return;
      }

      const signature = req.header("x-paystack-signature");
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));

      if (!isValidSignature(raw, signature, key)) {
        res.status(400).json({ error: "Invalid webhook signature" });
        return;
      }

      let body: any;
      try {
        body = JSON.parse(raw.toString("utf8"));
      } catch {
        res.status(400).json({ error: "Malformed JSON body" });
        return;
      }

      // Acknowledge fast; Paystack retries non-2xx deliveries with backoff.
      const ack = () => res.status(200).json({ received: true });

      const event: string | undefined = body?.event;
      const data = body?.data ?? {};

      if (event !== "charge.success") {
        ack();
        return;
      }

      const eventId = String(data.id ?? data.reference ?? "");
      if (!eventId || !payments.rememberEvent(eventId)) {
        // Duplicate delivery - already handled. Acknowledge without re-processing.
        ack();
        return;
      }

      const reference: string | undefined = data.reference;
      const payment = reference ? payments.get(reference) : undefined;

      if (!payment) {
        // Nothing we created. Acknowledge so Paystack stops retrying.
        ack();
        return;
      }

      if (typeof data.amount === "number" && data.amount !== payment.amountKobo) {
        // Amount mismatch: never mark paid.
        payments.markFailed(reference!, `amount_mismatch_${data.amount}`);
        ack();
        return;
      }

      payments.markPaid(reference!, {
        gatewayStatus: data.status ?? "success",
        channel: data.channel ?? null,
        settledBy: "webhook",
      });
      ack();
    },
  );

  // Everything below parses JSON.
  app.use(express.json({ limit: "100kb" }));

  // ----------------------------------------------------------------- health
  app.get("/api/health", (req: Request, res: Response) => {
    const key = secretKey();
    res.json({
      ok: true,
      service: "peppsbite-paystack",
      secretKeyConfigured: isSecretKey(key),
      mode: keyMode(key ?? ""),
      pending: payments.list("pending").length,
      paid: payments.list("paid").length,
      // The URL as received by the deployment, before the rewrite is undone.
      // Handy for confirming the API is reachable at all: open /api/health in
      // a browser on the deployed site.
      requestUrl: (req as Request & { incomingUrl?: string }).incomingUrl ?? req.url,
    });
  });

  // ------------------------------------------------------------- initialize
  // Records the intent server-side so /verify can cross-check the amount.
  // No Paystack API call here: the browser popup uses the PUBLIC key.
  app.post("/api/paystack/initialize", (req: Request, res: Response) => {
    const amountKobo = req.body?.amountKobo;
    const hasKobo = typeof amountKobo === "number" && Number.isInteger(amountKobo);

    if (!hasKobo || amountKobo <= 0) {
      res.status(400).json({
        error: "amountKobo must be a positive integer (naira * 100)",
      });
      return;
    }

    try {
      const payment = payments.create({
        reference: req.body?.reference ?? newReference(),
        amountKobo,
        currency: req.body?.currency ?? "NGN",
        email: req.body?.email ?? null,
        metadata: req.body?.metadata ?? {},
      });
      res.status(201).json({
        reference: payment.reference,
        amountKobo: payment.amountKobo,
        currency: payment.currency,
        status: payment.status,
      });
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  // ----------------------------------------------------------------- verify
  app.post("/api/paystack/verify", async (req: Request, res: Response) => {
    const key = secretKey();
    const reference: string | undefined = req.body?.reference;

    if (!reference || typeof reference !== "string") {
      res.status(400).json({ error: "reference is required" });
      return;
    }

    if (!isSecretKey(key)) {
      res.status(503).json({
        verified: false,
        error: "PAYSTACK_SECRET_KEY is not configured",
      });
      return;
    }

    const payment = payments.get(reference);

    if (payment?.status === "paid") {
      res.json({
        verified: true,
        status: "success",
        amountKobo: payment.amountKobo,
        currency: payment.currency,
        crossChecked: true,
        alreadySettled: true,
      });
      return;
    }

    try {
      const txn = await verifyReference(reference, key);

      if (txn.status !== "success") {
        payments.markFailed(reference, txn.status);
        res.json({
          verified: false,
          status: txn.status,
          amountKobo: txn.amount,
          currency: txn.currency,
        });
        return;
      }

      if (!payment) {
        // No local intent for this reference. That is expected when the
        // function was recycled between /initialize and /verify - the store is
        // in-memory. Paystack is still the authority on whether money moved,
        // so accept it, but say the amount was not cross-checked rather than
        // claiming a check that never ran.
        res.json({
          verified: true,
          status: txn.status,
          amountKobo: txn.amount,
          currency: txn.currency,
          crossChecked: false,
          channel: txn.channel ?? null,
        });
        return;
      }

      // Cross-check the amount the customer actually paid against what we
      // recorded at initialize time.
      if (txn.amount !== payment.amountKobo) {
        payments.markFailed(reference, `amount_mismatch_${txn.amount}`);
        res.status(409).json({
          verified: false,
          error: "amount_mismatch",
          expectedKobo: payment.amountKobo,
          paidKobo: txn.amount,
        });
        return;
      }

      payments.markPaid(reference, {
        gatewayStatus: txn.status,
        channel: txn.channel ?? null,
        settledBy: "verify",
      });
      res.json({
        verified: true,
        status: txn.status,
        amountKobo: txn.amount,
        currency: txn.currency,
        crossChecked: true,
        channel: txn.channel ?? null,
      });
    } catch (err) {
      if (err instanceof PaystackApiError) {
        const status = err.httpStatus === 404 ? 404 : 502;
        res.status(status).json({ verified: false, error: err.message });
        return;
      }
      res.status(502).json({ verified: false, error: "Could not reach Paystack" });
    }
  });

  // ----------------------------------------------------------------- status
  app.get("/api/paystack/payments/:reference", (req: Request, res: Response) => {
    const payment = payments.get(req.params.reference);
    if (!payment) {
      res.status(404).json({ error: "unknown_reference" });
      return;
    }
    res.json({
      reference: payment.reference,
      status: payment.status,
      amountKobo: payment.amountKobo,
      currency: payment.currency,
      settledAt: payment.settledAt,
      settledBy: payment.settledBy,
      channel: payment.channel,
      // Why it ended up failed, when it did: "abandoned", "amount_mismatch_100"...
      gatewayStatus: payment.gatewayStatus,
    });
  });

  // --------------------------------------------------------------- 404 last
  // Anything under /api that no route claimed answers in JSON, never with the
  // SPA's HTML, and echoes the URL the runtime actually received. That echo is
  // what turns "could not start the payment (404)" into a diagnosable bug when
  // the rewrite in vercel.json is not doing what we expect.
  app.use("/api", (req: Request, res: Response) => {
    res.status(404).json({
      error: "not_found",
      path: req.path,
      requestUrl: (req as Request & { incomingUrl?: string }).incomingUrl ?? req.url,
      hint: "Not part of the Peppsbite Paystack API. GET /api/health shows what is running.",
    });
  });

  return { app, store: payments, secretKey };
}
