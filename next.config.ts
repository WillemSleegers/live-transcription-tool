import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  webpack: (config, { isServer, webpack }) => {
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

      // Fix for Transformers.js v3.8+ node: protocol imports
      // See: https://github.com/webpack/webpack/issues/14166
      // Use NormalModuleReplacementPlugin to strip node: prefix and make modules resolvable
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );

      // Then use fallback to ignore these modules for browser builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        url: false,
      };
    }

    return config;
  },
};

export default nextConfig;
