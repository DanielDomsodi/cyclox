import type { NextConfig } from 'next';
import { withBetterStack } from '@logtail/next';

const nextConfig: NextConfig = withBetterStack({
  /* config options here */
});

export default nextConfig;
