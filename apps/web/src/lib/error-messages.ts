/** Public, localized error copy. Never display raw server or provider errors to guests. */
const errors: Record<string, string> = {
  AUTH_CONFIGURATION: "Sign-in is not configured. Please contact the site owner.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Check the email address you entered.",
  "auth/email-already-in-use": "This email already has an account. Sign in or reset your password.",
  "auth/weak-password": "Choose a stronger password with at least eight characters.",
  "auth/password-does-not-meet-requirements": "Choose a stronger password with at least eight characters.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/network-request-failed": "Connection lost. Try again.",
  "auth/user-disabled": "This account is disabled. Please contact the site owner.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/operation-not-allowed": "Sign-in is not configured. Please contact the site owner.",
  "auth/unauthorized-domain": "Sign-in is not configured. Please contact the site owner.",
  EMAIL_NOT_VERIFIED: "Verify your email before opening a show.",
  EMAIL_VERIFICATION_REQUIRED: "Verify your email before opening a show.",
  SLUG_TAKEN: "This profile address is already taken. Choose another one.",
  PROFILE_REQUIRED: "Create your musician profile to continue.",
  ACTIVE_HOLD: "You already have a reservation. Open My requests to continue or cancel it.",
  REVIEW_OVERDUE: "Review pending transfers before resuming requests.",
  VALIDATION_ERROR: "Check the information you entered.",
  INVALID_IMAGE: "Choose a valid JPG, PNG or WebP image within the size limit.",
  SHOW_CLOSED: "Requests are closed",
  CAPACITY_FULL: "The show is full",
  SONG_UNAVAILABLE: "This song is no longer available.",
  HOLD_EXPIRED: "Your reservation has expired.",
  UNAUTHORIZED: "Please sign in again.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  PRICE_CHANGED: "The price changed. Review the menu and try again.",
  PRICING_REVIEW_REQUIRED: "Review your dedication price before accepting new requests.",
  NETWORK_ERROR: "Connection lost. Try again.",
  ACTIVE_SHOW_EXISTS: "Finish your active show first.",
  CAPACITY_TOO_LOW: "Keep one slot beyond songs already played, and never drop below existing requests.",
  CAPACITY_BELOW_COMMITTED: "The limit cannot be lower than existing requests.",
  STALE_VERSION: "This information changed. Refresh and try again.",
};

export function errorMessageKey(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
  return errors[code] || "Something went wrong";
}
