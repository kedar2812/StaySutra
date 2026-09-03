import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 480, 768, 1024, 1280, 1536, 1920, 2400],
    imageSizes: [96, 160, 256, 384, 600, 900],
  },
  experimental: {
    optimizePackageImports: ["motion"],
  },
};

export default nextConfig;
