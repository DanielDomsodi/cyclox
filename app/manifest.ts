import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CycloX',
    short_name: 'CycloX',
    description:
      'A sleek cycling analytics app for tracking rides and optimizing performance',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-1024x1024.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  };
}
