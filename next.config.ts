import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/series', destination: '/category', permanent: false },
      { source: '/series/:slug*', destination: '/category/:slug*', permanent: false },
    ]
  },
  transpilePackages: ['tinymce', '@tinymce/tinymce-react', 'three', '@react-three/fiber', '@react-three/drei', 'matter-js', 'p5', 'paper'],
  // Next 16.3+ canary: persist Turbopack compile cache under `.next` across restarts.
  experimental: {
    authInterrupts: true,
    turbopackFileSystemCacheForDev: true,
  },
  webpack: (config, { dev }) => {
    // Disk cache when using `npm run dev:webpack`.
    if (dev) {
      config.cache = { type: 'filesystem' }
    }
    config.module.rules.push({
      test: /\.png$/i,
      type: 'asset/resource',
    })
    return config
  },
}

export default nextConfig
