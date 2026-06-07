#!/usr/bin/env node
/**
 * Birimistatistic — üretim static sunucu (yalnızca dist/)
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'url';
import handler from 'serve-handler';

const port = Number(process.env.PORT || 3000);
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const server = http.createServer((req, res) => {
  handler(req, res, {
    public: dist,
    cleanUrls: true,
    directoryListing: false,
    trailingSlash: false
  });
});

server.listen(port, () => {
  console.log(`Birimistatistic dist → http://0.0.0.0:${port}`);
});
