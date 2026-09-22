import type { NextConfig } from "next";

const originTrial = process.env.WEBMCP_ORIGIN_TRIAL;

const nextConfig: NextConfig = {
  async headers() {
    if (!originTrial) return [];

    return [
      {
        source: "/:path*",
        headers: [{ key: "Origin-Trial", value: originTrial }],
      },
    ];
  },
};

export default nextConfig;
