import type { NextConfig } from "next";

const production = process.env.NEXT_PUBLIC_APP_ENV === "prod";
const netlify = process.env.DEPLOY_TARGET === "netlify" || process.env.NETLIFY === "true";
const configuredOrigin = process.env.API_ORIGIN;
if (production) {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== "firebase") {
    throw new Error("Production requires NEXT_PUBLIC_AUTH_MODE=firebase; demo authentication is forbidden.");
  }
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    throw new Error("Firebase emulators cannot be used in production.");
  }
  if (!netlify) {
    if (!configuredOrigin) throw new Error("Production requires API_ORIGIN pointing to the deployed Express HTTPS endpoint.");
    const origin = new URL(configuredOrigin);
    const host = origin.hostname.toLowerCase();
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash ||
        host === "localhost" || host.endsWith(".localhost") || host === "[::1]" || host === "0.0.0.0" || /^127\./.test(host)) {
      throw new Error("Production API_ORIGIN must be a non-local HTTPS endpoint without credentials, query or fragment.");
    }
  }
  const required = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"];
  if (required.some((key) => !process.env[key])) throw new Error("Production Firebase web configuration is incomplete.");
}
const apiOrigin = (configuredOrigin || "http://127.0.0.1:4000").replace(/\/$/, "");
const config: NextConfig = {
  devIndicators: false,
  distDir: process.env.NEXT_PUBLIC_APP_ENV === "non-prod" && process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? ".next-firebase" : ".next",
  transpilePackages: ["@musica/contracts"],
  async rewrites() {
    return netlify ? [] : [{source: "/api/:path*", destination: `${apiOrigin}/api/:path*`}];
  },
};
export default config;
