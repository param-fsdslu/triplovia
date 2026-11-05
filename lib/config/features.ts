/**
 * Feature Flags Configuration
 *
 * Toggle features on/off for the entire application.
 * Changing a flag to `false` will:
 *   - Hide the feature from all navigation (guest + admin)
 *   - Hide related homepage sections and search widget tabs
 *   - Block direct URL access via middleware (returns 404)
 *
 * After changing a value, restart the dev server (or redeploy).
 */

export type FeatureName = "hotels" | "boats" | "blogs" | "cabs" | "bikes";

export const FEATURES: Record<FeatureName, boolean> = {
  hotels: true,
  boats: false,
  blogs: true,
  cabs: false,
  bikes: false,
};

export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURES[feature] ?? false;
}

/**
 * Email notification flags.
 * Set a flag to false to silence that category of email without touching
 * any other logic.  These are checked at the call-site, not in middleware.
 */
export const EMAIL_FLAGS = {
  reviewSubmittedConfirmation: false, // guest confirmation after submitting a review
} as const

export type EmailFlagName = keyof typeof EMAIL_FLAGS

export function isEmailEnabled(flag: EmailFlagName): boolean {
  return EMAIL_FLAGS[flag] ?? false
}

/**
 * Route-to-feature mapping.
 * Each pattern is a path segment that, when matched at the start of
 * a normalized pathname, indicates the route belongs to that feature.
 */
const FEATURE_ROUTE_PATTERNS: Record<FeatureName, string[]> = {
  hotels: ["/hotels", "/bookings"],
  boats: ["/boats", "/boat-bookings"],
  blogs: ["/blog", "/blogs"],
  cabs: ["/cabs"],
  bikes: ["/bikes"],
};

/**
 * Given a pathname, returns the feature it belongs to (if any).
 * Strips locale and /api prefixes before matching (middleware strips the admin panel's).
 */
export function getFeatureForPath(pathname: string): FeatureName | null {
  const normalized = pathname
    .replace(/^\/(en|es|fr)/, "")
    .replace(/^\/api/, "");

  for (const [feature, patterns] of Object.entries(FEATURE_ROUTE_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalized === pattern || normalized.startsWith(pattern + "/")) {
        return feature as FeatureName;
      }
    }
  }
  return null;
}

/**
 * Returns true if the given pathname should be blocked
 * because its parent feature is disabled.
 */
export function isRouteBlocked(pathname: string): boolean {
  const feature = getFeatureForPath(pathname);
  if (feature === null) return false;
  return !isFeatureEnabled(feature);
}
