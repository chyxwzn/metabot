const path = require('path');
const fs = require('fs');

// Load .env file and inject into process environment
const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  const content = fs.readFileSync(dotenvPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

module.exports = {
  apps: [
    {
      name: 'metabot',
      script: 'dist/index.js',
      cwd: __dirname,

      // Watch disabled — use `metabot restart` to apply code changes manually
      watch: false,

      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,

      // Logs
      error_file: path.join(__dirname, 'logs', 'error.log'),
      out_file: path.join(__dirname, 'logs', 'out.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Environment — inherits .env loaded above
      env: {
        NODE_ENV: 'production',
        CLAUDE_MAX_TURNS: '',
      },
    },
  ],
};
