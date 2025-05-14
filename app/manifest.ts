import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CycloX',
    short_name: 'CycloX',
    description:
      'A sleek cycling analytics app for tracking rides and optimizing performance',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f5f5f5',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
