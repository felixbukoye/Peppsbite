/**
 * Paystack server-side helpers.
 *
 * The secret key lives only here (and in the process environment). It is used
 * for two things:
 *   - verifying a transaction reference against Paystack's API
 *   - validating the x-paystack-signature header on incoming webhooks
 *
 * PAYSTACK_API_BASE is overridable so the routes can be tested against a local
 * stub instead of the real api.paystack.co.
 */
import crypto from "node:crypto";

export const DEFAULT_API_BASE = "https://api.paystack.co";

export function apiBase(): string {
  return (process.env.PAYSTACK_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
}

/** The transaction object Paystack returns from /transaction/verify/:reference */
export type PaystackTransaction = {
  status: string;
  reference: string;
  amount: number; // kobo
  currency: string;
  gateway_response?: string;
  channel?: string;
  paid_at?: string | null;
};

export type VerifyApiResponse = {
  status: boolean;
  message: string;
  data?: PaystackTransaction;
};

export class PaystackApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "PaystackApiError";
  }
}

/**
 * GET /transaction/verify/:reference with the secret key.
 * This is the authoritative answer to "did this payment actually succeed?".
 */
export async function verifyReference(
  reference: string,
  secretKey: string,
): Promise<PaystackTransaction> {
  const url = `${apiBase()}/transaction/verify/${encodeURIComponent(reference)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
  });

  let body: VerifyApiResponse;
  try {
    body = (await res.json()) as VerifyApiResponse;
  } catch {
    throw new PaystackApiError(`Paystack returned a non-JSON response (${res.status})`, res.status);
  }

  if (!res.ok || body.status !== true || !body.data) {
    throw new PaystackApiError(
      body.message || `Paystack could not verify ${reference}`,
      res.status,
    );
  }
  return body.data;
}

/**
 * Paystack signs webhooks with HMAC-SHA512 of the RAW request body, hex-encoded.
 * The raw bytes matter: re-serialising parsed JSON will not reproduce them.
 */
export function computeSignature(rawBody: Buffer | string, secretKey: string): string {
  return crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
}

/** Timing-safe comparison so a partially-correct signature leaks nothing. */
export function isValidSignature(
  rawBody: Buffer | string,
  signature: string | undefined | null,
  secretKey: string,
): boolean {
  if (!signature) return false;
  const expected = computeSignature(rawBody, secretKey);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Test-mode keys start with sk_test_, live with sk_live_. */
export function isSecretKey(value: string | undefined): value is string {
  return /^sk_(test|live)_[A-Za-z0-9]+$/.test((value ?? "").trim());
}

export function keyMode(secretKey: string): "test" | "live" | "unset" {
  if (/^sk_live_/.test(secretKey)) return "live";
  if (/^sk_test_/.test(secretKey)) return "test";
  return "unset";
}
