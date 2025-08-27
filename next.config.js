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
    }

    return config;
  },

  // Handle experimental features for ONNX
  experimental: {
    serverComponentsExternalPackages: ["onnxruntime-node"],
  },
};

module.exports = nextConfig;
