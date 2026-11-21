import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Lets phones and other computers on the home network open `next dev` by IP.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*", "*.local"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
