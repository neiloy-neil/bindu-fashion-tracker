const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('app').concat(walk('components'));
let deadLinks = [];
let missingApis = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const linkRegex = /href=["']([^"']+)["']/g;
  let m;
  while ((m = linkRegex.exec(content)) !== null) {
    const route = m[1];
    if (route.startsWith('/') && !route.startsWith('http') && !route.includes('$') && !route.includes('{') && !route.startsWith('/images')) {
      const pagePath = path.join('app', route, 'page.tsx');
      const routePath = path.join('app', route, 'route.ts');
      if (!fs.existsSync(pagePath) && !fs.existsSync(routePath) && route !== '/') {
        deadLinks.push(`${file} -> ${route}`);
      }
    }
  }

  const fetchRegex = /fetch\(["'](\/api\/[^"']+)["']/g;
  let fm;
  while ((fm = fetchRegex.exec(content)) !== null) {
    const api = fm[1];
    if (!api.includes('$') && !api.includes('{')) {
      const apiPath = path.join('app', api, 'route.ts');
      if (!fs.existsSync(apiPath)) {
        missingApis.push(`${file} -> ${api}`);
      }
    }
  }
});

console.log('Potential Dead Links:', [...new Set(deadLinks)]);
console.log('Potential Missing APIs:', [...new Set(missingApis)]);
