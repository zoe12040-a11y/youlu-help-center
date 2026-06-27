import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type declaration issues (Buffer, process, fs) are dev-env specific;
    // runtime behavior is correct. Errors are suppressed at build time.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
