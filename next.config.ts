import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Parent ~/package-lock.json otherwise wins as Turbopack / tracing root.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
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
