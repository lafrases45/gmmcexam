module.exports = {
  apps: [
    {
      name: 'gmmc-attendance-worker',
      script: 'scripts/attendance-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      merge_logs: true
    }
  ]
};
