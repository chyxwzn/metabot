#!/usr/bin/env node
// mm.js - MetaMemory CLI (Node.js implementation, works on Windows natively)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPaths = [
    join(homedir(), 'metabot', '.env'),
    join(homedir(), 'feishu-claudecode', '.env'),
    join(__dirname, '..', '.env'),
  ];
  for (const envPath of envPaths) {
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
}

loadEnv();

const MEMORY_URL = process.env.META_MEMORY_URL || process.env.MEMORY_SERVER_URL || 'http://localhost:8100';
const ADMIN_TOKEN = process.env.MEMORY_ADMIN_TOKEN;
const READER_TOKEN = process.env.MEMORY_TOKEN;
const MEMORY_SECRET = process.env.MEMORY_SECRET;
const API_SECRET = process.env.API_SECRET;
const TOKEN = ADMIN_TOKEN || READER_TOKEN || MEMORY_SECRET || API_SECRET;
const AUTH = TOKEN ? `Bearer ${TOKEN}` : '';

async function curl(path, opts = {}) {
  const url = new URL(`${MEMORY_URL}${path}`);
  const { default: http } = await import('http');
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: {},
    };
    if (AUTH) reqOpts.headers['Authorization'] = AUTH;
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
  case 'search':
  case 's': {
    const query = encodeURIComponent(args.join(' ') || '');
    curl(`/api/search?q=${query}`).then(json);
    break;
  }
  case 'get':
  case 'g':
    curl(`/api/documents/${args[0]}`).then(json);
    break;
  case 'path':
  case 'p': {
    const p = encodeURIComponent(args.join(' ') || '');
    curl(`/api/documents/by-path?path=${p}`).then(json);
    break;
  }
  case 'list':
  case 'ls':
    curl(`/api/documents?folder_id=${args[0] || 'root'}&limit=50`).then(json);
    break;
  case 'folders':
  case 'f':
    curl('/api/folders').then(json);
    break;
  case 'create':
  case 'c': {
    const title = args[0] || '';
    let folder = 'root', tags = '', by = '', content = '';
    let i = 1;
    while (i < args.length) {
      if (args[i] === '--folder' || args[i] === '-f') { folder = args[++i]; i++; }
      else if (args[i] === '--tags' || args[i] === '-t') { tags = args[++i]; i++; }
      else if (args[i] === '--by' || args[i] === '-b') { by = args[++i]; i++; }
      else { content = args.slice(i).join(' '); break; }
    }
    if (!title) { console.error('Usage: mm create <title> [--folder <id>] [--tags t1,t2] [--by name] [content]'); process.exit(1); }
    const body = { title, folder_id: folder, content, ...(tags && { tags: tags.split(',').map(t => t.trim()) }), ...(by && { created_by: by }) };
    curl('/api/documents', { method: 'POST', body: JSON.stringify(body) }).then(json);
    break;
  }
  case 'update':
  case 'u': {
    const docId = args[0] || '';
    if (!docId) { console.error('Usage: mm update <doc_id> [--title <t>] [--tags t1,t2] [content]'); process.exit(1); }
    let title = '', tags = '', content = '';
    let i = 1;
    while (i < args.length) {
      if (args[i] === '--title' || args[i] === '-T') { title = args[++i]; i++; }
      else if (args[i] === '--tags' || args[i] === '-t') { tags = args[++i]; i++; }
      else { content = args.slice(i).join(' '); break; }
    }
    const body = { ...(content && { content }), ...(title && { title }), ...(tags && { tags: tags.split(',').map(t => t.trim()) }) };
    curl(`/api/documents/${docId}`, { method: 'PUT', body: JSON.stringify(body) }).then(json);
    break;
  }
  case 'mkdir':
  case 'md': {
    const name = args[0] || '';
    const parent = args[1] || 'root';
    if (!name) { console.error('Usage: mm mkdir <folder-name> [parent_id]'); process.exit(1); }
    curl('/api/folders', { method: 'POST', body: JSON.stringify({ name, parent_id: parent }) }).then(json);
    break;
  }
  case 'delete':
  case 'rm':
    if (!args[0]) { console.error('Usage: mm delete <doc_id>'); process.exit(1); }
    curl(`/api/documents/${args[0]}`, { method: 'DELETE' }).then(json);
    break;
  case 'health':
  case 'h':
    curl('/api/health').then(json);
    break;
  default:
    console.log(`mm - MetaMemory CLI (Node.js)
  Read:
    mm search <query>           - Search documents
    mm get <doc_id>             - Get document by ID
    mm path </folder/doc>       - Get document by path
    mm list [folder_id]         - List documents
    mm folders                  - List folder tree

  Write:
    mm create <title> [opts] [content]  - Create document
        --folder <id>  Folder (default: root)
        --tags <a,b>   Comma-separated tags
        --by <name>    Creator name
    mm update <doc_id> [opts] [content] - Update document
        --title <t>    New title
        --tags <a,b>   New tags
    mm mkdir <name> [parent_id] - Create folder
    mm delete <doc_id>          - Delete document

  System:
    mm health                   - Health check`);
}
