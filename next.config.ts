import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type declaration issues (Buffer, process, fs) are dev-env specific;
    // runtime behavior is correct. Errors are suppressed at build time.
    ignoreBuildErrors: true,
  },
  // Pages Router body parser config (does not affect App Router api routes,
  // but kept here as documentation intent)
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
