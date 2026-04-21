import type { NextConfig } from "next";

// Defense-in-depth headers applied to every response.
// Rationale: the app has no untrusted user-generated HTML surface, but CSP
// guards against regressions; X-Frame-Options prevents clickjacking against
// the cookie-authenticated bracket/admin UI; HSTS forces HTTPS on the
// worldcup.chris.planow.com origin (Caddy also handles TLS, but signaling
// HSTS from the app makes the policy explicit and survives infra changes).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    // 'unsafe-inline' script: Next.js injects inline <script> for RSC flight data and hydration.
    // 'unsafe-eval' script: needed for dev/HMR and some framework paths.
    // fonts.gstatic.com: next/font serves Google fonts (Bricolage Grotesque, DM Sans) self-hosted,
    // but the preload links still reference gstatic.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Standalone output emits .next/standalone/ containing a minimal Node
  // server + trace-pruned node_modules. The Dockerfile copies that instead
  // of the full workspace, producing a small runtime image.
  output: "standalone",

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
