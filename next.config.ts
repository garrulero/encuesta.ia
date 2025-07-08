import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Fix webpack issues with genkit dependencies
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
      
      // Prevent OpenTelemetry modules from being bundled on client-side
      config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/api': false,
        '@opentelemetry/core': false,
        '@opentelemetry/exporter-jaeger': false,
        '@opentelemetry/exporter-zipkin': false,
        '@opentelemetry/instrumentation': false,
        '@opentelemetry/resources': false,
        '@opentelemetry/sdk-node': false,
        '@opentelemetry/auto-instrumentations-node': false,
      };
    }
    
    // Ignore problematic modules
    config.externals = config.externals || [];
    config.externals.push({
      '@opentelemetry/exporter-jaeger': 'commonjs @opentelemetry/exporter-jaeger',
      'handlebars': 'commonjs handlebars',
    });

    return config;
  },
  // Disable experimental features that might cause issues
  experimental: {
    serverComponentsExternalPackages: ['genkit', '@genkit-ai/core', '@genkit-ai/googleai'],
  },
};

export default nextConfig;