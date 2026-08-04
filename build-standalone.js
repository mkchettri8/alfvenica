'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
html = html.replace('  <link rel="stylesheet" href="styles.css">', `  <style>\n${css}\n  </style>`);

for (const file of ['plasma-physics.js', 'formula-registry.js', 'plot-registry.js', 'formula-insights.js', 'validation.js', 'app.js']) {
  const code = fs.readFileSync(path.join(root, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  html = html.replace(`  <script src="${file}" defer></script>`, `  <script>\n${code}\n  </script>`);
}

const output = path.join(root, 'alfvenica_standalone.html');
fs.writeFileSync(output, html);
console.log(`Built ${path.basename(output)} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`);
