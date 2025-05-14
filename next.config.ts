import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  server: {
    port: 3001,
  },
};

export default nextConfig;
