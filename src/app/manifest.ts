import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SiteLog',
    short_name: 'SiteLog',
    description: 'Construction Site Tracking',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F3F4F6',
    theme_color: '#4F46E5',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
