import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Increased from default 1mb to handle base64 images
    },
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
};

export default withPWA({
  dest: 'public',
  register: true,
})(nextConfig);
