import type { NextConfig } from "next";

const isStaticMode = process.env.NEXT_PUBLIC_STATIC_MODE === "true";
const pagesBasePath = "/75-soft-challenge";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStaticMode ? {
    output: "export",
    basePath: pagesBasePath,
    assetPrefix: `${pagesBasePath}/`,
    trailingSlash: true,
    images: { unoptimized: true }
  } : {})
};

export default nextConfig;
