#!/usr/bin/env node
'use strict';

// VECTOR backend: reads one .mmd path, bakes its text into the served
// viewer, opens it once, then exits. Zero dependencies, node stdlib only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const GRACE_MS = 3000;

function fail(message) {
  process.stderr.write('vector: ' + message + '\n');
  process.exit(1);
}

const fileArg = process.argv[2];
if (!fileArg) {
  fail('missing diagram path. usage: vector diagram.mmd');
}

const diagramPath = path.resolve(fileArg);
if (!/\.mmd$/i.test(diagramPath)) {
  fail('not a diagram file: "' + fileArg + '" is not an .mmd file.');
}

let source;
try {
  source = fs.readFileSync(diagramPath, 'utf8');
} catch (err) {
  fail('cannot read file "' + fileArg + '": ' + (err && err.message ? err.message : String(err)));
}

const viewerPath = path.join(__dirname, 'VECTOR.html');
let page;
try {
  page = fs.readFileSync(viewerPath, 'utf8');
} catch (err) {
  fail('cannot read viewer "' + viewerPath + '": ' + (err && err.message ? err.message : String(err)));
}

if (page.indexOf('<!--VECTOR_BAKED-->') === -1) {
  fail('viewer has no bake placeholder.');
}

const baked = JSON.stringify(source).replace(/</g, '\\u003c');
const bakedPage = page.replace(
  '<!--VECTOR_BAKED-->',
  '<script>window.__VECTOR_BAKED=' + baked + ';</script>'
);
const buf = Buffer.from(bakedPage, 'utf8');

let exiting = false;
function scheduleExit(server) {
  if (exiting) {
    return;
  }
  exiting = true;
  setTimeout(() => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  }, GRACE_MS);
}

const server = http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
  scheduleExit(server);
});

server.on('error', (err) => {
  fail('cannot serve: ' + (err && err.message ? err.message : String(err)));
});

server.listen(0, '127.0.0.1', () => {
  const addr = 'http://127.0.0.1:' + server.address().port + '/';
  process.stdout.write(addr + '\n');
  openBrowser(addr);
});

function openBrowser(addr) {
  const plat = process.platform;
  const cmd = plat === 'win32'
    ? 'start "" "' + addr + '"'
    : plat === 'darwin'
      ? 'open "' + addr + '"'
      : 'xdg-open "' + addr + '"';
  exec(cmd, (err) => {
    if (err) {
      process.stderr.write('vector: could not open browser: ' + err.message + '\n');
    }
  });
}
