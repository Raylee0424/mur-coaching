import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // CSV imports (≤ 5 MB) reach the API through server actions; the default action body limit is 1 MB.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default config;
