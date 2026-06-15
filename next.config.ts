import type { NextConfig } from "next";

const repo = "RealApp";
const isGithubPages = process.env.GITHUB_PAGES === "true";

const basePath = isGithubPages ? `/${repo}` : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: isGithubPages ? `/${repo}/` : undefined,
  trailingSlash: true,
  // Exposed to the client so runtime paths (service worker, notification icons)
  // resolve under the GitHub Pages basePath.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
