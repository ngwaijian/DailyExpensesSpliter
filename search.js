import fs from 'fs';
import path from 'path';

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      search(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.match(/window\.fetch\s*=/)) {
        console.log('Found window.fetch in', fullPath);
      }
      if (content.match(/globalThis\.fetch\s*=/)) {
        console.log('Found globalThis.fetch in', fullPath);
      }
    }
  }
}

// search('dist');
search('node_modules');
search('src');
