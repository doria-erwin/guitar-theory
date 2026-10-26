// Loads the whole app (same files and order as build.js) into a Node VM with minimal browser stubs,
// so question generators can be exercised without a browser. Math.random is seeded for reproducible runs.
const fs = require('fs'), path = require('path'), vm = require('vm');

const ORDER = (() => { const b = fs.readFileSync(path.join(__dirname, '..', 'build.js'), 'utf8'); return JSON.parse(b.match(/const order = (\[[^\]]*\])/)[1].replace(/'/g, '"')); })();

/* mulberry32: small, fast, deterministic PRNG. */
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function loadApp(seed = 1) {
  const store = {};
  const noop = () => {};
  const el = () => null;
  const ctx = {
    console,
    performance: { now: () => 0 },
    navigator: { userAgent: 'node' },
    window: { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, matchMedia: () => ({ matches: false }), addEventListener: noop, confirm: () => true },
    document: { addEventListener: noop, getElementById: el, querySelector: el, querySelectorAll: () => [], documentElement: { dataset: {} }, hidden: false },
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop
  };
  ctx.window.document = ctx.document;
  vm.createContext(ctx);
  const src = ORDER.map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
  vm.runInContext(src, ctx, { filename: 'app-bundle.js' });
  const rand = seeded(seed);
  ctx.__rand = rand;
  vm.runInContext('Math.random = __rand;', ctx);
  // Rendering is not needed for generator tests; keep actions that call render() harmless.
  vm.runInContext('render = () => {}; status = () => {};', ctx);
  return { ctx, run: code => vm.runInContext(code, ctx), store };
}

module.exports = { loadApp, seeded, ORDER };
