/**
 * In-memory payment intents and the pending -> paid lifecycle.
 *
 * A payment is created server-side BEFORE the customer sees the Paystack
 * popup, so the server always knows how much was expected. That expected
 * amount is what lets /verify reject a transaction whose amount was tampered
 * with in the browser.
 *
 * In-memory means state is lost on restart - swap `PaymentStore` for a real
 * database (or Redis) before going live. The interface is deliberately tiny so
 * that swap is local to this file.
 */

export type PaymentStatus = "pending" | "paid" | "failed";

export type Payment = {
  reference: string;
  amountKobo: number;
  currency: string;
  email: string | null;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  settledAt: string | null;
  /** Paystack's own transaction status, e.g. "success". */
  gatewayStatus: string | null;
  channel: string | null;
  /** Which source settled it: the /verify call or a webhook. */
  settledBy: "verify" | "webhook" | null;
};

export type CreatePaymentInput = {
  reference: string;
  amountKobo: number;
  currency?: string;
  email?: string | null;
  metadata?: Record<string, unknown>;
};

export type SettleResult = {
  /** False when the payment was already settled - i.e. a duplicate delivery. */
  changed: boolean;
  payment: Payment;
};

export class PaymentStore {
  private payments = new Map<string, Payment>();
  /** Webhook event ids already handled, for idempotency. */
  private seenEvents = new Set<string>();

  create(input: CreatePaymentInput): Payment {
    if (this.payments.has(input.reference)) {
      throw new Error(`Reference ${input.reference} already exists`);
    }
    if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) {
      throw new Error("amountKobo must be a positive integer");
    }
    const payment: Payment = {
      reference: input.reference,
      amountKobo: input.amountKobo,
      currency: input.currency ?? "NGN",
      email: input.email ?? null,
      status: "pending",
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
      settledAt: null,
      gatewayStatus: null,
      channel: null,
      settledBy: null,
    };
    this.payments.set(payment.reference, payment);
    return payment;
  }

  get(reference: string): Payment | undefined {
    return this.payments.get(reference);
  }

  /**
   * Move a payment to `paid`. Safe to call repeatedly: only the first call
   * reports changed=true, which is what keeps duplicate webhooks from
   * double-fulfilling an order.
   */
  markPaid(
    reference: string,
    info: { gatewayStatus?: string; channel?: string; settledBy: "verify" | "webhook" },
  ): SettleResult | undefined {
    const payment = this.payments.get(reference);
    if (!payment) return undefined;

    if (payment.status === "paid") {
      return { changed: false, payment };
    }
    payment.status = "paid";
    payment.settledAt = new Date().toISOString();
    payment.gatewayStatus = info.gatewayStatus ?? "success";
    payment.channel = info.channel ?? null;
    payment.settledBy = info.settledBy;
    return { changed: true, payment };
  }

  markFailed(reference: string, gatewayStatus: string): SettleResult | undefined {
    const payment = this.payments.get(reference);
    if (!payment) return undefined;
    if (payment.status !== "pending") return { changed: false, payment };
    payment.status = "failed";
    payment.settledAt = new Date().toISOString();
    payment.gatewayStatus = gatewayStatus;
    return { changed: true, payment };
  }

  /**
   * Records a webhook event id. Returns false if it was already seen, so the
   * caller can skip re-processing a retry.
   */
  rememberEvent(eventId: string): boolean {
    if (this.seenEvents.has(eventId)) return false;
    this.seenEvents.add(eventId);
    return true;
  }

  list(status?: PaymentStatus): Payment[] {
    const all = [...this.payments.values()];
    return status ? all.filter((p) => p.status === status) : all;
  }

  /** Test helper. */
  reset(): void {
    this.payments.clear();
    this.seenEvents.clear();
  }
}

/** Shared by the running server; tests build their own instance. */
export const store = new PaymentStore();
