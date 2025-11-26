import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
      // Fix for Transformers.js v3 webpack resolution issue
      // https://github.com/xenova/transformers.js/issues/911
      "@huggingface/transformers": path.resolve(
        process.cwd(),
        "node_modules/@huggingface/transformers"
      ),
    };

    // Transformers.js v3 configuration for Web Workers
    if (!isServer) {
      // Handle import.meta.url in workers
      config.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Support for worker files
      config.output.publicPath = '/_next/';
      config.output.scriptType = 'module';
    }

    return config;
  },
};

export default nextConfig;
