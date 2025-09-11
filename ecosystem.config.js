module.exports = {
  apps: [
    {
      name: "dokter-api",
      script: "src/index.js",
      instances: "max", // Gunakan semua CPU cores
      exec_mode: "cluster",

      // Environment variables
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },

      // Logging
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Auto restart options
      watch: false,
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,

      // Advanced options
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,

      // Health check
      health_check_grace_period: 3000,

      // Custom settings
      node_args: "--max-old-space-size=1024",

      // Ignore watching
      ignore_watch: ["node_modules", "logs", "uploads", ".git"],

      // Environment specific settings
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },

      env_development: {
        NODE_ENV: "development",
        PORT: 4000,
      },
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: "your-username",
      host: "your-server-ip",
      ref: "origin/main",
      repo: "https://github.com/yourusername/dokter-consultation-api.git",
      path: "/var/www/dokter-api",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && npx prisma generate && npx prisma db push && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
