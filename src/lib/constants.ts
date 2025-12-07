/**
 * Application Constants
 *
 * Centralized constants to eliminate magic numbers and ensure consistency
 */

// ============================================================================
// INVITATION SETTINGS
// ============================================================================

/** Email invitation expiration in days */
export const EMAIL_INVITATION_EXPIRY_DAYS = 7;

/** Link invitation expiration in days */
export const LINK_INVITATION_EXPIRY_DAYS = 30;

/** Length of invitation token in bytes (hex string will be 2x) */
export const INVITATION_TOKEN_BYTES = 32;

// ============================================================================
// QUERY DEFAULTS
// ============================================================================

/** Default days ahead for event listing */
export const DEFAULT_EVENT_QUERY_DAYS = 90;

// ============================================================================
// ROLE LABELS
// ============================================================================

/**
 * Human-readable labels for family member roles
 */
export const ROLE_LABELS: Record<string, string> = {
  parent_1: 'Primary Parent',
  parent_2: 'Co-Parent',
  attorney: 'Attorney',
  grandparent: 'Grandparent',
} as const;

// ============================================================================
// STATUS LABELS
// ============================================================================

/**
 * Human-readable labels for swap request statuses
 */
export const SWAP_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
} as const;

/**
 * Human-readable labels for invitation statuses
 */
export const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  revoked: 'Revoked',
} as const;
