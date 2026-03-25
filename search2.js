import fs from 'fs';
import path from 'path';

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      search(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.match(/fetch\s*=/)) {
        console.log('Found fetch= in', fullPath);
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.match(/fetch\s*=/)) {
            console.log(`  Line ${i+1}: ${line}`);
          }
        });
      }
    }
  }
}

search('node_modules/html-to-image');
