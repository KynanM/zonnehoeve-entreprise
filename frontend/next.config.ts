import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Rewrites verwijderd: de /api/[...path]/route.ts API route proxy vervangt dit.
  // Die route leest BACKEND_URL op request-time (niet bij compileren zoals rewrites).
};

export default nextConfig;
