/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        // Proxy all /api/* requests to the backend service inside Kubernetes
        source: '/api/:path*',
        destination: 'http://backend-service:8081/api/:path*',
      },
    ]
  },
}

export default nextConfig
