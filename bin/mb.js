#!/usr/bin/env node
// mb.js - MetaBot API CLI (Node.js implementation, works on Windows natively)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(homedir(), 'metabot', '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnv();

const PORT = process.env.API_PORT || '9100';
const SECRET = process.env.API_SECRET || 'changeme';
const BASE_URL = process.env.METABOT_URL || `http://localhost:${PORT}`;
const AUTH = `Bearer ${SECRET}`;

async function api(path, opts = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  const { default: http } = await import('http');
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: { 'Authorization': AUTH },
    };
    if (opts.body) {
      reqOpts.headers['Content-Type'] = 'application/json';
    }
    const req = http.request(reqOpts, res => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => {
        try { resolve(JSON.parse(out)); }
        catch { resolve(out); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function json(out) {
  try { console.log(JSON.stringify(out, null, 2)); }
  catch { console.log(out); }
}

const cmd = process.argv[2] || 'help';
const args = process.argv.slice(3);

switch (cmd) {
  case 'bots':
  case 'b':
    api('/api/bots').then(json);
    break;
  case 'bot':
    api(`/api/bots/${args[0]}`).then(json);
    break;
  case 'health':
  case 'h':
    api('/api/health').then(json);
    break;
  case 'peers':
  case 'p':
    api('/api/peers').then(json);
    break;
  case 'stats':
  case 'st':
    api('/api/stats').then(json);
    break;
  case 'metrics':
  case 'm':
    api('/api/metrics');
    break;
  case 'schedule':
  case 'sched':
  case 'sc': {
    const sub = args[0] || 'help';
    if (sub === 'list' || sub === 'ls') {
      api('/api/schedule').then(json);
    } else {
      console.error('Only "mb schedule list" is supported in Node.js mb.js. Use bash mb for full features.');
    }
    break;
  }
  case 'help':
  default:
    console.log(`mb - MetaBot API CLI (Node.js)
  mb bots                          - List all bots
  mb bot <name>                   - Get bot details
  mb health                       - Health check
  mb peers                        - List peers
  mb stats                        - Cost & usage stats
  mb schedule list                - List scheduled tasks
For full features (talk, voice, skills, etc.), use bash mb from Git Bash.`);
}
