// Sentry client-side initialization — only runs if NEXT_PUBLIC_SENTRY_DSN is set
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require("@sentry/nextjs");
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
  });
}
