/**
 * Tests for the Paystack backend.
 *
 *   npm test
 *
 * Paystack itself is replaced by a local stub (`PAYSTACK_API_BASE`), so these
 * run offline and never touch real keys or real money.
 *
 * The interesting cases are the deployment-shaped ones: every request goes to
 * `/api/index?__vpath=<path>`, which is exactly how Vercel reaches the single
 * function in api/index.ts (see vercel.json).
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import { createApp } from "../server/index.js";
import { PaymentStore } from "../server/payments.js";

/**
 * A fake key that satisfies the `sk_test_...` shape. Built from parts so that
 * secret scanners - GitHub push protection included - do not mistake this test
 * fixture for a real Paystack/Stripe key.
 */
const SECRET_KEY = ["sk", "test", "peppsbiteTestKeyOnly0001"].join("_");
/** Same value we expect Paystack's API stub to report for this reference. */
const PAID_REFERENCE = "pepps_stubpaid";

type StubTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string;
};

let paystackStub: http.Server;
let stubBase: string;
let api: http.Server;
let apiBase: string;

/** What the Paystack stub will answer for /transaction/verify/:reference. */
let stubTransactions = new Map<string, StubTransaction>();

function stubListen(): Promise<string> {
  return new Promise((resolve) => {
    paystackStub.listen(0, "127.0.0.1", () => {
      const { port } = paystackStub.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

before(async () => {
  stubTransactions = new Map();

  paystackStub = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://stub");
    const match = url.pathname.match(/^\/transaction\/verify\/(.+)$/);
    if (!match) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: false, message: "not found" }));
      return;
    }

    const reference = decodeURIComponent(match[1]);
    const txn = stubTransactions.get(reference);
    if (!txn) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: false, message: "Transaction not found" }));
      return;
    }

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: true, message: "ok", data: txn }));
  });
  stubBase = await stubListen();
  process.env.PAYSTACK_API_BASE = stubBase;

  const { app } = createApp({ secretKey: SECRET_KEY, store: new PaymentStore() });
  api = http.createServer(app);
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  apiBase = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
});

after(async () => {
  delete process.env.PAYSTACK_API_BASE;
  await Promise.all([
    new Promise<void>((resolve) => paystackStub.close(() => resolve())),
    new Promise<void>((resolve) => api.close(() => resolve())),
  ]);
});

/**
 * Calls a route the way production does: one function, path in the query.
 * Setting `direct: true` calls the pretty URL the local server also serves.
 */
function call(
  route: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string>; direct?: boolean } = {},
): Promise<Response> {
  const method = options.method ?? "GET";
  const init: RequestInit = {
    method,
    headers: {
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  };

  if (options.direct) {
    return fetch(`${apiBase}${route}`, init);
  }
  const [pathname, query = ""] = route.split("?");
  const vpath = pathname.replace(/^\/api\//, "");
  const params = new URLSearchParams(query);
  params.set("__vpath", vpath);
  return fetch(`${apiBase}/api/index?${params.toString()}`, init);
}

async function initialize(body: Record<string, unknown>): Promise<string> {
  const res = await call("/api/paystack/initialize", { method: "POST", body });
  assert.equal(res.status, 201);
  const json = (await res.json()) as { reference: string };
  return json.reference;
}

describe("deployment routing", () => {
  it("is reachable at /api/health and reports what arrived", async () => {
    const res = await call("/api/health");
    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      ok: boolean;
      secretKeyConfigured: boolean;
      mode: string;
      requestUrl: string;
    };
    assert.equal(json.ok, true);
    assert.equal(json.secretKeyConfigured, true);
    assert.equal(json.mode, "test");
    assert.match(json.requestUrl, /^\/api\/index\?__vpath=health$/);
  });

  it("serves the pretty URL too (local dev without a rewrite)", async () => {
    const res = await call("/api/health", { direct: true });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { requestUrl: string };
    assert.equal(json.requestUrl, "/api/health");
  });

  it("also accepts Vercel's own capture forwarding (?path=...)", async () => {
    // Depending on how the rewrite in vercel.json is evaluated the captured
    // path may arrive as `path` instead of `__vpath`; both must route.
    const res = await fetch(`${apiBase}/api/index?path=health`);
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { ok: boolean }).ok, true);
  });

  it("keeps unknown routes a JSON 404 and echoes what arrived", async () => {
    const res = await call("/api/paystack/nope", { method: "POST", body: {} });
    assert.equal(res.status, 404);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
    const json = (await res.json()) as { error: string; path: string; requestUrl: string };
    assert.equal(json.error, "not_found");
    assert.equal(json.path, "/paystack/nope");
    assert.equal(json.requestUrl, "/api/index?__vpath=paystack%2Fnope");
  });

  it("answers a bare /api/index with nothing to route on", async () => {
    const res = await fetch(`${apiBase}/api/index`);
    assert.equal(res.status, 404);
    const json = (await res.json()) as { requestUrl: string };
    assert.equal(json.requestUrl, "/api/index");
  });

  it("keeps the original query string for rewritten GETs", async () => {
    const reference = await initialize({ amountKobo: 150000 });
    const res = await call(`/api/paystack/payments/${reference}`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { status: string };
    assert.equal(json.status, "pending");
  });
});

describe("initialize", () => {
  it("rejects a non-positive or fractional amount", async () => {
    for (const amountKobo of [0, -100, 12.5, "500"]) {
      const res = await call("/api/paystack/initialize", { method: "POST", body: { amountKobo } });
      assert.equal(res.status, 400, `amountKobo=${amountKobo} should be rejected`);
    }
  });

  it("returns a reference and remembers the expected amount", async () => {
    const res = await call("/api/paystack/initialize", {
      method: "POST",
      body: { amountKobo: 250000, email: "ada@example.com", currency: "NGN" },
    });
    assert.equal(res.status, 201);

    const created = (await res.json()) as { reference: string; amountKobo: number; status: string };
    assert.match(created.reference, /^pepps_[0-9a-f]+$/);
    assert.equal(created.amountKobo, 250000);
    assert.equal(created.status, "pending");

    const status = await call(`/api/paystack/payments/${created.reference}`);
    const payment = (await status.json()) as { amountKobo: number; status: string };
    assert.equal(payment.amountKobo, 250000);
    assert.equal(payment.status, "pending");
  });

  it("refuses a reference it already knows", async () => {
    const body = { amountKobo: 100000, reference: "pepps_duplicate" };
    assert.equal((await call("/api/paystack/initialize", { method: "POST", body })).status, 201);
    assert.equal((await call("/api/paystack/initialize", { method: "POST", body })).status, 409);
  });
});

describe("verify", () => {
  it("requires a reference", async () => {
    const res = await call("/api/paystack/verify", { method: "POST", body: {} });
    assert.equal(res.status, 400);
  });

  it("marks a matching charge paid", async () => {
    const reference = await initialize({ amountKobo: 300000 });
    stubTransactions.set(reference, {
      status: "success",
      reference,
      amount: 300000,
      currency: "NGN",
      channel: "card",
    });

    const res = await call("/api/paystack/verify", { method: "POST", body: { reference } });
    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      verified: boolean;
      status: string;
      crossChecked: boolean;
      channel: string;
    };
    assert.equal(json.verified, true);
    assert.equal(json.status, "success");
    assert.equal(json.crossChecked, true);
    assert.equal(json.channel, "card");

    const status = await call(`/api/paystack/payments/${reference}`);
    assert.equal(((await status.json()) as { status: string }).status, "paid");
  });

  it("settles idempotently: a second call does not change anything", async () => {
    const reference = await initialize({ amountKobo: 5000 });
    stubTransactions.set(reference, {
      status: "success",
      reference,
      amount: 5000,
      currency: "NGN",
    });

    await call("/api/paystack/verify", { method: "POST", body: { reference } });
    const second = await call("/api/paystack/verify", { method: "POST", body: { reference } });
    const json = (await second.json()) as { verified: boolean; alreadySettled?: boolean };
    assert.equal(json.verified, true);
    assert.equal(json.alreadySettled, true);
  });

  it("rejects a charge whose amount does not match the intent", async () => {
    const reference = await initialize({ amountKobo: 400000 });
    stubTransactions.set(reference, {
      status: "success",
      reference,
      amount: 100, // customer paid way less than the order total
      currency: "NGN",
    });

    const res = await call("/api/paystack/verify", { method: "POST", body: { reference } });
    assert.equal(res.status, 409);
    const json = (await res.json()) as { error: string; expectedKobo: number; paidKobo: number };
    assert.equal(json.error, "amount_mismatch");
    assert.equal(json.expectedKobo, 400000);
    assert.equal(json.paidKobo, 100);

    const status = await call(`/api/paystack/payments/${reference}`);
    assert.equal(((await status.json()) as { status: string }).status, "failed");
  });

  it("passes an unsuccessful charge straight through", async () => {
    const reference = await initialize({ amountKobo: 7000 });
    stubTransactions.set(reference, {
      status: "abandoned",
      reference,
      amount: 7000,
      currency: "NGN",
    });

    const res = await call("/api/paystack/verify", { method: "POST", body: { reference } });
    const json = (await res.json()) as { verified: boolean; status: string };
    assert.equal(json.verified, false);
    assert.equal(json.status, "abandoned");
  });

  it("trusts Paystack but flags an unchecked amount when the intent was lost", async () => {
    // Simulates a recycled serverless instance: /initialize ran somewhere else.
    stubTransactions.set(PAID_REFERENCE, {
      status: "success",
      reference: PAID_REFERENCE,
      amount: 123400,
      currency: "NGN",
    });

    const res = await call("/api/paystack/verify", {
      method: "POST",
      body: { reference: PAID_REFERENCE },
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { verified: boolean; crossChecked: boolean; amountKobo: number };
    assert.equal(json.verified, true);
    assert.equal(json.crossChecked, false);
    assert.equal(json.amountKobo, 123400);
  });

  it("404s a reference Paystack has never seen", async () => {
    const res = await call("/api/paystack/verify", {
      method: "POST",
      body: { reference: "pepps_never_existed" },
    });
    assert.equal(res.status, 404);
    const json = (await res.json()) as { verified: boolean };
    assert.equal(json.verified, false);
  });
});

describe("webhook", () => {
  function sign(rawBody: string, key = SECRET_KEY): string {
    return crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  }

  async function deliver(event: unknown, options: { signature?: string; raw?: string } = {}) {
    const raw = options.raw ?? JSON.stringify(event);
    return fetch(`${apiBase}/api/index?__vpath=paystack/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": options.signature ?? sign(raw),
      },
      body: raw,
    });
  }

  it("rejects an unsigned or wrongly signed body", async () => {
    const noSignature = await fetch(`${apiBase}/api/index?__vpath=paystack/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "charge.success" }),
    });
    assert.equal(noSignature.status, 400);

    const badSignature = await deliver(
      { event: "charge.success", data: { id: 1, reference: "x", status: "success" } },
      { signature: "deadbeef" },
    );
    assert.equal(badSignature.status, 400);
  });

  it("marks the order paid for a signed charge.success", async () => {
    const reference = await initialize({ amountKobo: 99000 });
    const res = await deliver({
      event: "charge.success",
      data: { id: 555001, reference, status: "success", amount: 99000, channel: "bank_transfer" },
    });
    assert.equal(res.status, 200);

    const status = await call(`/api/paystack/payments/${reference}`);
    const payment = (await status.json()) as { status: string; settledBy: string; channel: string };
    assert.equal(payment.status, "paid");
    assert.equal(payment.settledBy, "webhook");
    assert.equal(payment.channel, "bank_transfer");
  });

  it("ignores a duplicate delivery instead of re-processing it", async () => {
    const reference = await initialize({ amountKobo: 4500 });
    const event = {
      event: "charge.success",
      data: { id: 555002, reference, status: "success", amount: 4500 },
    };

    assert.equal((await deliver(event)).status, 200);
    const res = await deliver(event);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
  });

  it("never marks a mismatched amount paid", async () => {
    const reference = await initialize({ amountKobo: 80000 });
    const res = await deliver({
      event: "charge.success",
      data: { id: 555003, reference, status: "success", amount: 100 },
    });
    assert.equal(res.status, 200);

    const status = await call(`/api/paystack/payments/${reference}`);
    const payment = (await status.json()) as { status: string; gatewayStatus: string };
    assert.equal(payment.status, "failed");
    assert.equal(payment.gatewayStatus, "amount_mismatch_100");
  });

  it("acknowledges events it does not act on", async () => {
    const res = await deliver({ event: "subscription.create", data: { id: 1 } });
    assert.equal(res.status, 200);
  });

  it("reads the exact bytes that were signed, not a re-serialisation", async () => {
    const reference = await initialize({ amountKobo: 6600 });
    // Key order and spacing differ from any JSON.stringify we would produce.
    const raw = `{"data":{"id":555004,"amount":6600,"reference":"${reference}","status":"success"},"event":"charge.success"}`;
    const res = await deliver(JSON.parse(raw), { raw });
    assert.equal(res.status, 200);

    const status = await call(`/api/paystack/payments/${reference}`);
    assert.equal(((await status.json()) as { status: string }).status, "paid");
  });
});
