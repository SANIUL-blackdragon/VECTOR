'use strict';
// VECTOR acceptance suite for issue #7. Headless and isolated: every
// agent-browser call runs headless under a named session, and agent-browser
// drives its own Chromium binary with temp profiles, never the human
// Chrome window or profile. No --headed flag anywhere in this file.
// Run: node tests/agent/suite.js
// Needs: agent-browser on PATH with a Chrome it can drive headless.

const { execFile, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'file:///' + ROOT.replace(/\\/g, '/') + '/VECTOR.html';
const S = 'vector-qa';
const SOFF = 'vector-qa-off';
function agentBin() {
  if (process.platform !== 'win32') {
    return 'agent-browser';
  }
  const { execSync } = require('child_process');
  const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return path.join(root, 'agent-browser', 'bin', 'agent-browser-win32-x64.exe');
}
const AB = agentBin();
const results = [];
let failures = 0;

function pass(name) {
  results.push('PASS ' + name);
}
function fail(name, why) {
  failures += 1;
  results.push('FAIL ' + name + ' :: ' + why);
}

function ab(session, argv) {
  return new Promise((resolve, reject) => {
    execFile(AB, ['--session', session, ...argv], {
      timeout: 180000,
      maxBuffer: 64 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error('agent-browser ' + argv.slice(0, 3).join(' ') + ' failed: ' + (stderr || err.message).slice(0, 300)));
        return;
      }
      resolve(stdout);
    });
  });
}

function runScript(session, js) {
  return ab(session, ['eval', '-b', Buffer.from(js, 'utf8').toString('base64')]);
}

async function runBig(session, js) {
  const b64 = Buffer.from(js, 'utf8').toString('base64');
  const CH = 20000;
  await runScript(session, 'window.__parts = []; "ready"');
  for (let i = 0; i < b64.length; i += CH) {
    await runScript(session, 'window.__parts.push("' + b64.slice(i, i + CH) + '"); "part"');
  }
  return runScript(session, 'window.eval(new TextDecoder().decode(Uint8Array.from(atob(window.__parts.join("")), function (c) { return c.charCodeAt(0); }))); "ran"');
}

function readExpr(session, expr) {
  return runScript(session, expr).then((s) => s.replace(/^\uFEFF/, '').replace(/\x1b\[[0-9;]*m/g, '').trim());
}

function num(s) {
  try {
    let v = s;
    for (let i = 0; i < 3 && typeof v === 'string'; i++) {
      v = JSON.parse(v);
    }
    return parseFloat(v);
  } catch (e) { return NaN; }
}

function feedScript(name, b64src) {
  return `window.__t = null;
(function () {
  try {
    var bytes = Uint8Array.from(atob("${b64src}"), function (c) { return c.charCodeAt(0); });
    var src = new TextDecoder().decode(bytes);
    var picker = document.querySelector('[data-testid="picker"]');
    var dt = new DataTransfer();
    dt.items.add(new File([src], "${name}", { type: "text/plain" }));
    picker.files = dt.files;
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    window.__t = "fed";
  } catch (e) { window.__t = "error:" + String((e && e.message) || e); }
})();`;
}

async function waitFlag(session, expr, label) {
  try {
    await ab(session, ['wait', '--fn', expr]);
    return true;
  } catch (e) {
    fail(label, 'wait expired: ' + String(e.message || e).slice(0, 160));
    return false;
  }
}

function tiny() {
  return 'graph TB\n  A[Hello Vector]\n  B[Second Node]\n  A-->|go|B';
}

function big680() {
  const p = ['graph TB'];
  let n = 0;
  for (let g = 0; g < 20; g++) {
    p.push('  subgraph G' + g + ' ["Group ' + g + '"]');
    for (let i = 0; i < 34; i++) {
      p.push('    n' + n + '[Box ' + n + ']');
      n += 1;
    }
    p.push('  end');
  }
  for (let i = 0; i + 1 < 680; i += 2) {
    p.push('  n' + i + '-->n' + (i + 1));
  }
  return p.join('\n');
}

function warn55k() {
  const p = ['graph LR'];
  for (let i = 0; i < 300; i++) {
    p.push('  w' + i + '[Label ' + i + ' ' + 'x'.repeat(150) + ']');
  }
  for (let i = 0; i < 299; i++) {
    p.push('  w' + i + '-->w' + (i + 1));
  }
  return p.join('\n');
}

const SVG_READY = "!!document.querySelector('#canvas svg') && !!document.querySelector('#canvas svg').style.transform";
const ERR_READY = "!document.getElementById('error-panel').hidden";
const WARN_READY = "!document.getElementById('warn-panel').hidden";
const SCALE_OF = "JSON.stringify((/scale\\(([0-9.]+)\\)/.exec(document.querySelector('#canvas svg').style.transform) || [])[1] || null)";

async function main() {
  // 0. close any leftover sessions from earlier runs, then open isolated
  await new Promise((resolve) => {
    execFile(AB, ['close', '--all'], { timeout: 60000 }, () => resolve());
  });
  // 1. open plus picker hook
  await ab(S, ['open', PAGE]);
  await ab(S, ['console', '--clear']);
  const snap2 = await ab(S, ['snapshot', '-i', '-d', '2']);
  if (snap2.includes('Pick an .mmd file')) { pass('open plus picker hook'); }
  else { fail('open plus picker hook', 'picker missing'); }

  // 2. valid pick renders
  await runScript(S, feedScript('tiny.mmd', Buffer.from(tiny()).toString('base64')));
  if (await waitFlag(S, SVG_READY, 'valid pick renders')) {
    const svgCount = await readExpr(S, 'JSON.stringify(!!document.querySelector("#canvas svg"))');
    if (svgCount === '"true"') { pass('valid pick renders'); }
    else { fail('valid pick renders', 'no svg'); }
  }
  const scale0 = await readExpr(S, SCALE_OF);

  // 3. zoom in changes scale
  await ab(S, ['find', 'testid', 'zoom-in', 'click']);
  const scale1 = await readExpr(S, SCALE_OF);
  const n0 = num(scale0);
  const n1 = num(scale1);
  if (n1 > n0) { pass('zoom in changes scale'); }
  else { fail('zoom in changes scale', 'raw0=' + JSON.stringify(scale0) + ' raw1=' + JSON.stringify(scale1) + ' n0=' + n0 + ' n1=' + n1); }

  // 4. pan moves view, button path plus keyboard path. Either direction
  // counts: at a clamp boundary one direction rightly refuses to move.
  const x0 = await readExpr(S, 'JSON.stringify(document.querySelector("#canvas svg").style.transform)');
  await runScript(S, 'document.querySelector(\'[data-testid="pan-right"]\').click(); "clicked"');
  const x1 = await readExpr(S, 'JSON.stringify(document.querySelector("#canvas svg").style.transform)');
  await runScript(S, 'document.querySelector(\'[data-testid="pan-left"]\').click(); "clicked"');
  const x1b = await readExpr(S, 'JSON.stringify(document.querySelector("#canvas svg").style.transform)');
  if (x0 !== x1 || x0 !== x1b) { pass('pan moves view'); }
  else { fail('pan moves view', 'before=' + x0 + ' right=' + x1 + ' left=' + x1b); }
  await runScript(S, 'document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })); "keyed"');
  const x2 = await readExpr(S, 'JSON.stringify(document.querySelector("#canvas svg").style.transform)');
  if (x1 !== x2) { pass('arrow keys pan'); }
  else { fail('arrow keys pan', 'transform unchanged'); }

  // 5. reset returns to default
  await ab(S, ['find', 'testid', 'reset-default', 'click']);
  const scaleR = await readExpr(S, SCALE_OF);
  if (scaleR === scale0) { pass('reset returns to default'); }
  else { fail('reset returns to default', scale0 + ' vs ' + scaleR); }

  // 6. fit shows whole diagram
  await ab(S, ['find', 'testid', 'reset-view', 'click']);
  const con1 = await ab(S, ['console']);
  if (con1.includes('event=view-fit')) { pass('fit shows whole diagram'); }
  else { fail('fit shows whole diagram', 'no view-fit line'); }

  // 7. bad extension errors by hook
  await runScript(S, feedScript('bad.txt', Buffer.from('not a diagram').toString('base64')));
  if (await waitFlag(S, ERR_READY, 'bad extension errors')) {
    const con2 = await ab(S, ['console']);
    if (con2.includes('event=file-rejected')) { pass('bad extension errors'); }
    else { fail('bad extension errors', 'no file-rejected line'); }
  }

  // 8. warn flow: panel, proceed, render
  const wsrc = warn55k();
  if (wsrc.length <= 50000) { fail('warn flow setup', 'source under threshold'); }
  else {
    await runBig(S, feedScript('warn.mmd', Buffer.from(wsrc).toString('base64')));
    if (await waitFlag(S, WARN_READY, 'warn panel appears')) {
      pass('warn panel appears');
      await ab(S, ['find', 'testid', 'warn-proceed', 'click']);
      if (await waitFlag(S, SVG_READY, 'warn proceed renders')) {
        const con3 = await ab(S, ['console']);
        if (con3.includes('event=warn-proceed') && con3.includes('event=render-done')) {
          pass('warn proceed renders');
        } else { fail('warn proceed renders', 'console lines missing'); }
      }
    }
  }

  // 9. 680-box diagram renders
  await runBig(S, feedScript('big-680.mmd', Buffer.from(big680()).toString('base64')));
  if (await waitFlag(S, SVG_READY, '680-box renders')) {
    const shot = path.join(os.tmpdir(), 'vector-680.png');
    await ab(S, ['screenshot', shot]);
    if (fs.existsSync(shot)) { pass('680-box renders'); }
    else { fail('680-box renders', 'no screenshot artifact'); }
  }

  // 10. console contract across the run
  const conAll = await ab(S, ['console']);
  const need = ['event=file-picked', 'event=render-start', 'event=render-done', 'event=view-default'];
  const missing = need.filter((k) => !conAll.includes(k));
  if (!missing.length) { pass('console contract'); }
  else { fail('console contract', 'missing ' + missing.join(',')); }

  // 11. offline: block all network, reload, render still works
  await ab(SOFF, ['open', PAGE]);
  await ab(SOFF, ['network', 'route', '**/*', '--abort']);
  await ab(SOFF, ['open', PAGE]);
  await runScript(SOFF, feedScript('tiny.mmd', Buffer.from(tiny()).toString('base64')));
  if (await waitFlag(SOFF, SVG_READY, 'offline render works')) {
    pass('offline render works');
  }

  // 12. backend serves baked view then exits
  const fixture = path.join(ROOT, 'tests', 'fixtures', 'tiny.mmd');
  const child = spawn('node', ['backend.js', fixture], { cwd: ROOT });
  let url = null;
  const deadline = Date.now() + 15000;
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  while (Date.now() < deadline && !url) {
    await new Promise((r) => setTimeout(r, 300));
    const m = /http:\/\/127\.0\.0\.1:\d+\//.exec(out);
    if (m) { url = m[0]; }
  }
  if (!url) { fail('backend serves baked view', 'no address'); }
  else {
    const body = await new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let b = '';
        res.on('data', (d) => { b += d; });
        res.on('end', () => resolve({ code: res.statusCode, body: b }));
      }).on('error', reject);
    });
    if (body.code === 200 && body.body.includes('window.__VECTOR_BAKED=') && body.body.includes('Hello Vector')) {
      pass('backend serves baked view');
    } else { fail('backend serves baked view', 'bad page ' + body.code); }
    const exited = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(false), 12000);
      child.on('exit', () => { clearTimeout(t); resolve(true); });
    });
    if (!exited) { child.kill(); fail('backend exits clean', 'still running'); }
    else {
      await new Promise((resolve) => {
        http.get(url, () => resolve(false)).on('error', () => resolve(true));
      }).then((closed) => {
        if (closed) { pass('backend exits clean'); }
        else { fail('backend exits clean', 'port still open'); }
      });
    }
  }

  console.log(results.join('\n'));
  console.log(failures === 0 ? 'SUITE GREEN' : 'SUITE RED ' + failures);
  await new Promise((resolve) => {
    execFile(AB, ['close', '--all'], { timeout: 60000 }, () => resolve());
  });
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.log('SUITE ERROR ' + String((e && e.message) || e).slice(0, 300));
  process.exit(1);
});
