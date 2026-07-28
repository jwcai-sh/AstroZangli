import type { NextConfig } from "next";
import { getBackendOrigin } from "./src/lib/backendApi";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    const backendOrigin = getBackendOrigin();

    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
