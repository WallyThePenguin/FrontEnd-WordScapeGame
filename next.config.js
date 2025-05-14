/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        FRONTEND_URL: process.env.FRONTEND_URL,
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    },
}

module.exports = nextConfig 