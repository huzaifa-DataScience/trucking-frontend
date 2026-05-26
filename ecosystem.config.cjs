/**
 * PM2 — production Next.js (Windows-friendly).
 *
 *   cd trucking-frontend  (see docs/README.md)
 *   npm install
 *   npm run build
 *   pm2 delete trucking-frontend
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs trucking-frontend
 */
module.exports = {
  apps: [
    {
      name: "trucking-frontend",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
