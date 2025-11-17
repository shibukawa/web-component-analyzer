#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

function walkDir(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixImports() {
  console.log('🔧 Fixing ESM imports to add .js extensions...\n');

  // Find all .js files in dist
  const files = walkDir(distDir);
  
  let fixedCount = 0;
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    const originalContent = content;
    
    // Fix relative imports without .js extension
    // Match: from '../path/to/module' or from './path/to/module'
    // But not: from '../path/to/module.js' or from '@package/name'
    content = content.replace(
      /from\s+['"](\.[./]*[^'"]+?)(?<!\.js)['"];/g,
      (match, importPath) => {
        // Don't add .js if it's already there or if it's a package import
        if (importPath.includes('@') || importPath.endsWith('.js')) {
          return match;
        }
        return `from '${importPath}.js';`;
      }
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf-8');
      fixedCount++;
      console.log(`✓ Fixed: ${path.relative(distDir, file)}`);
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} files`);
}

fixImports();
