import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Pictures, animations and sounds get their content hash in the file name at build time
 * (art/cow-idle.webp -> art/cow-idle.3f9a1c2b.webp). A changed file gets a new name, so phones
 * and the offline cache can never show an old copy: a normal reload picks up every update.
 * The game asks for files by their plain name through asset() (see src/core/assets.ts).
 */
const SRC = 'public', DIRS = ['art', 'anim', 'audio'];

function walk(dir: string, out: string[] = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (!f.startsWith('.')) out.push(p);
  }
  return out;
}

export function hashedAssets(): Plugin {
  let map: Record<string, string> = {};
  const files: Record<string, string> = {};          // hashed name -> source path
  let dev = false;
  const scan = () => {
    map = {};
    for (const d of DIRS) for (const p of walk(join(SRC, d))) {
      const rel = relative(SRC, p).split('\\').join('/');
      if (dev) { map[rel] = rel; files[rel] = p; continue; }
      const h = createHash('md5').update(readFileSync(p)).digest('hex').slice(0, 8);
      const ext = extname(rel), hashed = rel.slice(0, -ext.length) + '.' + h + ext;
      map[rel] = hashed; files[hashed] = p;
    }
  };
  return {
    name: 'little-barn-hashed-assets',
    configResolved(c) { dev = c.command === 'serve'; scan(); },
    resolveId(id) { return id === 'virtual:assets' ? '\0virtual:assets' : null; },
    load(id) { return id === '\0virtual:assets' ? `export default ${JSON.stringify(map)};` : null; },
    generateBundle() {
      for (const [name, p] of Object.entries(files)) this.emitFile({ type: 'asset', fileName: name, source: readFileSync(p) });
    },
    transformIndexHtml(html) {
      return html.replace(/(href|src)="((?:art|anim|audio)\/[^"]+)"/g, (m, a, p) => `${a}="${map[p] || p}"`);
    },
    // In development the files are served straight from public/
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
        const p = files[u];
        if (!p) return next();
        res.end(readFileSync(p));
      });
    }
  };
}
