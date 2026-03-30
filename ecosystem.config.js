module.exports = {
  apps: [{
    name: 'auditor-libre',
    script: './server.js',

    // SQLite works best with a single writer process in production.
    instances: 1,
    exec_mode: 'fork',

    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3001,
      HOST: '127.0.0.1'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },

    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Performance
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,

    // Restart behavior
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data'],

    // Graceful shutdown
    listen_timeout: 3000,
    kill_timeout: 5000,
    wait_ready: true,

    // Monitoring
    instance_var: 'INSTANCE_ID',

    // Advanced features
    source_map_support: true,

    // Health check (PM2 Plus)
    // health_check: {
    //   enabled: true,
    //   max_memory_restart: '500M',
    //   max_restarts: 5,
    //   min_uptime: '10s'
    // }
  }],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/auditor-libre.git',
      path: '/var/www/auditor-libre',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
