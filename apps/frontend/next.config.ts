import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep production builds from overwriting the running local preview cache.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // Bound build-time workers so multilingual builds also fit smaller machines.
  experimental: {
    cpus: 2,
    staticGenerationMaxConcurrency: 2,
  },
  transpilePackages: ["@vexira/ui", "@vexira/types", "@vexira/utils", "@vexira/api-sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  output: "standalone",
};

export default withNextIntl(nextConfig);
