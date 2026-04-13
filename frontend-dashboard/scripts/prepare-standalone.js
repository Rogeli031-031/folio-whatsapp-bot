/**
 * Tras `next build` con `output: "standalone"`, copia `.next/static` y `public` dentro de
 * `.next/standalone` para que `node .next/standalone/server.js` sirva assets (Render / Docker).
 */
const fs = require("fs");
const path = require("path");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const serverJs = path.join(standalone, "server.js");

if (!fs.existsSync(serverJs)) {
  console.warn("[prepare-standalone] No .next/standalone/server.js — omitiendo (¿falta output: standalone en next.config?).");
  process.exit(0);
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");

copyRecursive(staticSrc, staticDest);
copyRecursive(publicSrc, publicDest);
console.log("[prepare-standalone] Copiados .next/static y public → .next/standalone");
