import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Allow dev requests from server IP and localhost on ports 3000–3005
  allowedDevOrigins: [
    "http://172.20.20.225:3000",
    "http://172.20.20.225:3001",
    "http://172.20.20.225:3002",
    "http://172.20.20.225:3003",
    "http://172.20.20.225:3004",
    "http://172.20.20.225:3005",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
  ],
};

export default nextConfig;
