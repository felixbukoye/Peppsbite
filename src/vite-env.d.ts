/// <reference types="vite/client" />

/**
 * Client-visible environment variables.
 *
 * Only variables prefixed with VITE_ are inlined into the browser bundle, so
 * anything declared here is PUBLIC. Never declare a secret (e.g. Paystack's
 * sk_test_ / sk_live_ secret key) here or with a VITE_ prefix — it would ship
 * to every visitor.
 */
interface ImportMetaEnv {
  /** Paystack PUBLIC key: pk_test_... or pk_live_... Safe to expose. */
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
