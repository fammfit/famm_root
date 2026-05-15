import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@famm/shared", "@famm/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
    ],
  },
};

export default nextConfig;
