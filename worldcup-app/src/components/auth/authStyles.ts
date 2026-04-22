/**
 * Shared styling helpers for auth forms rendered over the brand gradient.
 *
 * These are consumed by Login / Register / ForgotPasswordReset forms. We do
 * NOT modify the Input primitive (tokens/primitives are owned elsewhere);
 * instead we export a className builder used alongside the shared <Input />.
 */

// Glass-input styling for inputs layered over the brand gradient (landing).
export const glassInputClass =
  "h-12 rounded-lg border-white/20 bg-white/10 text-center text-base text-white placeholder:text-white/50 focus-visible:border-accent focus-visible:ring-accent/40";

// Primary CTA on the gradient — gold filled.
export const glassSubmitClass =
  "h-12 rounded-lg bg-accent text-base font-semibold text-text-on-accent transition-transform duration-150 hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40";

// The muted link button that swaps between login/register.
export const glassSwitchClass =
  "text-sm text-white/70 transition-colors hover:text-accent focus-visible:text-accent";
