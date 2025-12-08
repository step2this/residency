/**
 * Polyfills for Schedule-X and other dependencies
 *
 * IMPORTANT: This file must be imported BEFORE any Schedule-X components
 * to ensure Temporal API is available.
 */

// Temporal API polyfill (required for Schedule-X v3+)
import '@js-temporal/polyfill';
