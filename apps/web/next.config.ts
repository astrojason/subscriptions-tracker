import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sub-tracker/db"],
};

export default nextConfig;
