import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output emits .next/standalone/ containing a minimal Node
  // server + trace-pruned node_modules. The Dockerfile copies that instead
  // of the full workspace, producing a small runtime image.
  output: "standalone",
};

export default nextConfig;
