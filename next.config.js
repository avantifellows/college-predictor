/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Configure webpack to handle ONNX Runtime for server-side only
  webpack: (config, { isServer }) => {
    // Handle ONNX Runtime for server-side only
    if (isServer) {
      config.externals.push({
        "onnxruntime-node": "commonjs onnxruntime-node",
      });

      // Additional configuration for Amplify/serverless environments
      config.externals.push("onnxruntime-node");
    }

    return config;
  },

  // Handle experimental features for ONNX
  experimental: {
    serverComponentsExternalPackages: ["onnxruntime-node"],
  },

  // Amplify-specific optimizations
  output: "standalone",

  // Reduce bundle size for serverless
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
