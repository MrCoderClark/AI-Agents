import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  transpilePackages: [
    "@ai-agents/ui",
    "@ai-agents/graph",
    "@ai-agents/api-client",
  ],
};

export default nextConfig;
