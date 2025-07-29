module.exports = {
  apps: [
    {
      name: 'tekaicontext-app',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Logging
      log_file: './logs/app.log',
      out_file: './logs/app-out.log',
      error_file: './logs/app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    },
    {
      name: 'tekaicontext-worker',
      script: 'dist/worker.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'sync',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'sync',
      },
      env_development: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'sync',
      },
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '2G',
      
      // Logging
      log_file: './logs/worker.log',
      out_file: './logs/worker-out.log',
      error_file: './logs/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      health_check_grace_period: 5000,
      health_check_fatal_exceptions: true,
    },
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server'],
      ref: 'origin/main',
      repo: 'git@github.com:username/TekAIContextEngine2.git',
      path: '/var/www/tekaicontext',
      'post-deploy': 'npm ci --only=production && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y',
    },
    staging: {
      user: 'deploy',
      host: ['staging-server'],
      ref: 'origin/develop',
      repo: 'git@github.com:username/TekAIContextEngine2.git',
      path: '/var/www/tekaicontext-staging',
      'post-deploy': 'npm ci && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
