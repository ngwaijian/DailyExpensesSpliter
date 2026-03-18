import fs from 'fs';
import path from 'path';

function replaceInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/rounded-\[2rem\]/g, 'rounded-2xl');
  content = content.replace(/rounded-3xl/g, 'rounded-2xl');
  fs.writeFileSync(filePath, content);
}

function walk(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walk(path.join(process.cwd(), 'src'));
console.log('Done');
