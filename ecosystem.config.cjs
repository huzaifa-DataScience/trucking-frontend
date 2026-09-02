/**
 * PM2 — production Next.js (Windows-friendly).
 *
 *   cd trucking-frontend
 *   npm install
 *   npm run build
 *   pm2 delete trucking-frontend
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 logs trucking-frontend
 */
module.exports = {
  apps: [
    {
      name: "trucking-frontend",
      cwd: __dirname,
      // Use npm script so Windows path / incomplete next bin is less fragile
      script: "npm",
      args: "run start",
      interpreter: "none",
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
