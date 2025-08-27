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
    } else {
      // Client-side: completely ignore any ONNX runtime references
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "onnxruntime-web": false,
        "onnxruntime-node": false,
      };
    }

    // Exclude any ONNX files from being processed by Terser
    if (config.optimization && config.optimization.minimizer) {
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === "TerserPlugin") {
          if (!minimizer.options) {
            minimizer.options = {};
          }
          if (!minimizer.options.exclude) {
            minimizer.options.exclude = [];
          }
          // Exclude ONNX files from minification
          minimizer.options.exclude.push(/ort\.bundle/);
          minimizer.options.exclude.push(/onnxruntime/);
        }
      });
    }

    return config;
  },

  // Handle experimental features for ONNX
  experimental: {
    serverComponentsExternalPackages: ["onnxruntime-node"],
  },

  // Reduce bundle size for serverless
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
