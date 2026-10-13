import type { NextConfig } from "next";
import { getBackendOrigin } from "./src/lib/backendApi";

const nextConfig: NextConfig = {
  output: "standalone",
  // npm workspaces hoist Next.js into the repository-level node_modules.
  outputFileTracingRoot: `${process.cwd()}/..`,
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
