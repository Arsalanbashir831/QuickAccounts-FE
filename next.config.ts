import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.PLAYWRIGHT_DIST_DIR ?? ".next",
};

export default nextConfig;
