// Remembers when a verification email was last sent to an address, so the
// "Resend in Ns" countdown survives reloads and revisits instead of starting
// over. Purely a UX hint: the server enforces its own rate limit regardless.

export const RESEND_COOLDOWN = 60; // seconds

const key = (email) => `twillboard:verification-sent:${email.trim().toLowerCase()}`;

export function markVerificationSent(email) {
  try {
    localStorage.setItem(key(email), String(Date.now()));
  } catch {
    // Storage unavailable (private mode): the countdown just starts fresh.
  }
}

/** Whole seconds until another link may be requested (0 = now). */
export function secondsUntilResend(email) {
  let sentAt;
  try {
    sentAt = Number(localStorage.getItem(key(email))) || 0;
  } catch {
    return 0;
  }
  const elapsed = (Date.now() - sentAt) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN - elapsed));
}
