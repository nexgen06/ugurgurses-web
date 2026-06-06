import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = process.env.PORT || '3000';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serveBin = path.join(root, 'node_modules', 'serve', 'build', 'main.js');

const child = spawn(process.execPath, [serveBin, root, '-l', port], {
  stdio: 'inherit',
  cwd: root,
});

child.on('exit', (code) => process.exit(code ?? 0));
