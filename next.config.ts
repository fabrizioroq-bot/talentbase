import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (pdfjs-dist) resolves its worker file relative to its own
  // node_modules location at runtime; bundling it breaks that lookup, so it
  // must run as a plain Node require() instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
