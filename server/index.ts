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
import express, { type Express, type Request, type Response } from "express";
import crypto from "node:crypto";
import {
  PaystackApiError,
  isSecretKey,
  isValidSignature,
  keyMode,
  verifyReference,
} from "./paystack";
import { PaymentStore, store as sharedStore } from "./payments";

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
  app.get("/api/health", (_req: Request, res: Response) => {
    const key = secretKey();
    res.json({
      ok: true,
      service: "peppsbite-paystack",
      secretKeyConfigured: isSecretKey(key),
      mode: keyMode(key ?? ""),
      pending: payments.list("pending").length,
      paid: payments.list("paid").length,
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

    const payment = payments.get(reference);
    if (!payment) {
      // We only verify references we issued, so an unverifiable reference
      // cannot be used to launder an unrelated transaction into an order.
      res.status(404).json({ verified: false, error: "unknown_reference" });
      return;
    }

    if (payment.status === "paid") {
      res.json({
        verified: true,
        status: "success",
        amountKobo: payment.amountKobo,
        currency: payment.currency,
        alreadySettled: true,
      });
      return;
    }

    if (!isSecretKey(key)) {
      res.status(503).json({
        verified: false,
        error: "PAYSTACK_SECRET_KEY is not configured",
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
    });
  });

  return { app, store: payments, secretKey };
}
