/**
 * Paystack integration for Peppsbite.
 *
 * Flow (Paystack Inline JS — https://paystack.com/docs/payments/accept-payments/):
 *
 *   1. The browser loads https://js.paystack.co/v1/inline.js
 *   2. PaystackPop.setup({ key, email, amount, currency, ref }).openIframe()
 *      opens the hosted checkout popup. `amount` is in KOBO, not naira.
 *   3. `callback` fires when the customer RETURNS from the popup.
 *      >>> It does NOT mean the payment succeeded. <<<
 *   4. The browser sends the reference to OUR backend, which calls
 *      GET https://api.paystack.co/transaction/verify/:reference with the
 *      SECRET key and returns the authoritative status.
 *   5. Independently, Paystack POSTs a `charge.success` webhook to the backend.
 *      Webhooks are the source of truth for marking an order paid.
 *
 * What lives where:
 *   - This file needs only the PUBLIC key (VITE_PAYSTACK_PUBLIC_KEY).
 *   - The SECRET key must never appear in this repo's frontend. Vite inlines
 *     every VITE_* variable into the shipped bundle.
 */

/** Paystack's hosted inline checkout script. */
export const INLINE_SCRIPT_URL = "https://js.paystack.co/v1/inline.js";

/** Backend route that must exist for step 4 above. */
export const VERIFY_ENDPOINT = "/api/paystack/verify";

// `import.meta.env` only exists under Vite; guard it so this module is safe to
// import from plain Node (tests, scripts) too.
const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const PAYSTACK_PUBLIC_KEY: string = (env.VITE_PAYSTACK_PUBLIC_KEY ?? "").trim();

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackPopOptions) => { openIframe: () => void };
    };
  }
}

type PaystackPopOptions = {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string; trxref?: string }) => void;
  onClose: () => void;
};

/** A Paystack public key always looks like pk_test_... or pk_live_... */
export function isPaystackConfigured(key: string = PAYSTACK_PUBLIC_KEY): boolean {
  return /^pk_(test|live)_[A-Za-z0-9]+$/.test(key);
}

/**
 * Paystack amounts are integers in the currency's smallest unit.
 * For NGN that is kobo, so NGN 4,500.00 -> 450000.
 *
 * Rounds before multiplying-by-100 so floating point cannot shave a kobo
 * (e.g. 19.99 * 100 === 1998.9999999999998 would truncate to 1998).
 */
export function toKobo(naira: number): number {
  if (!Number.isFinite(naira) || naira <= 0) return 0;
  return Math.round(Number((naira * 100).toFixed(2)));
}

/** Paystack requires a unique reference per transaction. */
export function makeReference(prefix = "pepps"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Loose RFC-ish email check — enough for the checkout gate. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

let scriptPromise: Promise<void> | null = null;

/** Injects Paystack's inline script once, memoised across calls. */
export function loadPaystackScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = INLINE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Paystack checkout script"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type PaystackOutcome =
  | { status: "success"; reference: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/**
 * Opens the Paystack popup and resolves with the reference.
 *
 * A "success" here means the customer came back from the popup — the caller
 * MUST still confirm the charge with verifyTransaction() before treating the
 * order as paid.
 */
export async function payWithPaystack(options: {
  email: string;
  amountNaira: number;
  reference?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackOutcome> {
  if (!isPaystackConfigured()) {
    return {
      status: "error",
      message:
        "Paystack isn't configured yet. Set VITE_PAYSTACK_PUBLIC_KEY to a pk_test_ key to enable it.",
    };
  }

  if (!isValidEmail(options.email)) {
    return { status: "error", message: "Enter a valid email address to pay with Paystack." };
  }

  const amount = toKobo(options.amountNaira);
  if (amount <= 0) {
    return { status: "error", message: "Order total must be greater than zero." };
  }

  const reference = options.reference ?? makeReference();

  try {
    await loadPaystackScript();
  } catch {
    return {
      status: "error",
      message: "Could not reach Paystack. Check your connection and try again.",
    };
  }

  const pop = window.PaystackPop;
  if (!pop) {
    return { status: "error", message: "Paystack checkout failed to start. Please try again." };
  }

  return openPaystackPopup({
    key: PAYSTACK_PUBLIC_KEY,
    email: options.email.trim(),
    amountKobo: amount,
    reference,
    metadata: options.metadata,
  });
}

/**
 * Opens the hosted popup with an explicit key.
 *
 * Split out from payWithPaystack so the exact options handed to Paystack
 * (amount in kobo, currency, ref, callback wiring) can be asserted in tests
 * without needing a live public key.
 */
export function openPaystackPopup(options: {
  key: string;
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackOutcome> {
  const pop = typeof window === "undefined" ? undefined : window.PaystackPop;
  if (!pop) {
    return Promise.resolve({
      status: "error",
      message: "Paystack checkout failed to start. Please try again.",
    });
  }

  return new Promise<PaystackOutcome>((resolve) => {
    pop.setup({
      key: options.key,
      email: options.email,
      amount: options.amountKobo,
      currency: "NGN",
      ref: options.reference,
      metadata: options.metadata ?? {},
      callback: () => resolve({ status: "success", reference: options.reference }),
      onClose: () => resolve({ status: "cancelled" }),
    }).openIframe();
  });
}

/** Backend route that records a payment intent before the popup opens. */
export const INITIALIZE_ENDPOINT = "/api/paystack/initialize";

/** Backend route for polling a payment's lifecycle status. */
export const STATUS_ENDPOINT = "/api/paystack/payments";

export type InitializeResult =
  | { status: "created"; reference: string }
  /** The backend is not running. The caller decides whether to fall back. */
  | { status: "unavailable" }
  | { status: "rejected"; message: string };

/**
 * Asks our backend to record how much this order is supposed to cost, BEFORE
 * the customer reaches Paystack. That server-side record is what lets /verify
 * reject a transaction whose amount was altered in the browser.
 */
export async function initializePayment(options: {
  amountNaira: number;
  email?: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  const amountKobo = toKobo(options.amountNaira);
  if (amountKobo <= 0) {
    return { status: "rejected", message: "Order total must be greater than zero." };
  }

  try {
    const res = await fetch(INITIALIZE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountKobo,
        currency: "NGN",
        email: options.email?.trim() ?? null,
        metadata: options.metadata ?? {},
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        status: "rejected",
        message: body.error ?? `Could not start the payment (HTTP ${res.status}).`,
      };
    }

    const data = (await res.json()) as { reference?: string };
    if (!data.reference) {
      return { status: "rejected", message: "The payment server returned no reference." };
    }
    return { status: "created", reference: data.reference };
  } catch {
    // Network error / backend down - distinct from an explicit rejection.
    return { status: "unavailable" };
  }
}

export type PaymentStatus = "pending" | "paid" | "failed";

/** Polls the backend for a payment's lifecycle status. */
export async function getPaymentStatus(
  reference: string,
): Promise<{ status: PaymentStatus } | null> {
  try {
    const res = await fetch(`${STATUS_ENDPOINT}/${encodeURIComponent(reference)}`);
    if (!res.ok) return null;
    return (await res.json()) as { status: PaymentStatus };
  } catch {
    return null;
  }
}

export type VerifyResult = {
  verified: boolean;
  status?: string;
  amountKobo?: number;
  currency?: string;
};

/**
 * Asks OUR backend to confirm the charge against Paystack.
 *
 * This endpoint does not exist yet — see the integration notes. Until it does,
 * callers should treat a thrown error as "not yet wired", not as "failed".
 */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const res = await fetch(VERIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference }),
  });
  if (!res.ok) {
    throw new Error(`Verification endpoint responded with ${res.status}`);
  }
  return (await res.json()) as VerifyResult;
}
