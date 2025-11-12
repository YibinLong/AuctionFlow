import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Turbopack config
  turbopack: {},

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size for client-side
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
