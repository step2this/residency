/**
 * Next.js Instrumentation Hook
 *
 * This file is the first code to execute in the Next.js application.
 * It's used to load critical polyfills that need to be available before
 * any other modules are evaluated.
 *
 * Reference: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Load Temporal polyfill FIRST
  // This must happen before Schedule-X or any module that depends on the Temporal API
  // is evaluated by the bundler
  await import('@js-temporal/polyfill');
}
