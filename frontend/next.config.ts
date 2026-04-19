import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Explicitly configure webpack to resolve @ path alias
  // Next.js doesn't always automatically convert tsconfig.json paths to webpack aliases in Docker builds
  webpack: (config) => {
    // Resolve @ alias to project root directory
    // This matches tsconfig.json: "@/*": ["./*"]
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
};

export default nextConfig;
