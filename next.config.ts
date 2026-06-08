import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "1024mb",
    },
  },
};

export default nextConfig;
