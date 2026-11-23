import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(root, 'site');
await mkdir(site, { recursive: true });

const source = await readFile(resolve(root, 'web/template.html'), 'utf8');
const rendererStart = '<script>\n(function(){\n\'use strict\';';
const rendererEnd = '\n})();\n</script>';
if (!source.includes(rendererStart) || !source.includes(rendererEnd)) {
  throw new Error('Could not locate the Overworld renderer block in web/template.html');
}
let dashboard = source
  .replace('<title>Overworld</title>', '<title>Overworld · Your workspace</title>')
  .replace('/*__DATA__*/', '{}')
  .replace(rendererStart, '<script>\nfunction startOverworld(WORLD){\n(function(){\n\'use strict\';')
  .replace('const WORLD=JSON.parse(document.getElementById(\'ow-data\').textContent);', '')
  .replace(rendererEnd, `\n})();\n}\nconst bakedWorld=JSON.parse(document.getElementById('ow-data').textContent);\nif(document.documentElement.dataset.overworldApp==='true'){\n  fetch('/api/world',{credentials:'same-origin'}).then(async r=>{if(r.status===401){location.replace('/');return null}if(!r.ok)throw new Error('Could not load your workspace');return r.json()}).then(w=>{if(w)startOverworld(w)}).catch(e=>{document.getElementById('stage').innerHTML='<div style="padding:32px;color:var(--fg)">'+e.message+'</div>'});\n}else startOverworld(bakedWorld);\n</script>`);

dashboard = dashboard.replace('<!doctype html>', '<!doctype html>\n<html data-overworld-app="true">');
dashboard = dashboard.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>', '<script>window.OVERWORLD_APP_MODE=true;</script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>');
dashboard = dashboard.replace('</header>', `
    <div id="ow-account" class="ow-account"><span id="ow-user"></span><button id="ow-add-project" class="ow-action">+ Project</button><button id="ow-add-task" class="ow-action">+ Task</button><button id="ow-connect-gemini" class="ow-action ow-primary">Connect Gemini</button><button id="ow-logout" class="ow-action">Sign out</button></div>
  </header>`);

dashboard = dashboard.replace('</style>', `
.ow-account{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto}
.ow-account #ow-user{font-size:12px;color:var(--fg-2);padding:0 6px}
.ow-action{border:1px solid var(--line);background:var(--bg-2);border-radius:9px;padding:6px 10px;font:600 12px var(--f-display);color:var(--fg);cursor:pointer}
.ow-action:hover{border-color:var(--accent);color:var(--accent)}.ow-primary{background:var(--accent-2);border-color:var(--accent-2);color:white}
@media(max-width:860px){.ow-account{width:100%;order:4}.ow-account #ow-user{margin-right:auto}}
</style>`);
dashboard += '\n<script src="/app.js" defer></script>\n</html>\n';

await writeFile(resolve(site, 'dashboard.html'), dashboard);
await writeFile(resolve(site, 'index.html'), await readFile(resolve(root, 'site-src/index.html'), 'utf8'));
await writeFile(resolve(site, 'login.js'), await readFile(resolve(root, 'site-src/login.js'), 'utf8'));
await writeFile(resolve(site, 'app.js'), await readFile(resolve(root, 'site-src/app.js'), 'utf8'));
console.log('Built Overworld app into site/');
