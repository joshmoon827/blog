import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@muyajs/core', 'tinymce', '@tinymce/tinymce-react'],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.png$/i,
      type: 'asset/resource',
    })
    return config
  },
}

export default nextConfig
