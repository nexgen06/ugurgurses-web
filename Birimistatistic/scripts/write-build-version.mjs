import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString();
writeFileSync(join(root, 'public', 'BUILD_VERSION.txt'), `Birim İstatistik build: ${stamp}\n`, 'utf8');
