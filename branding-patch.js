const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Advanced Branding Patch for SkIDEancer
 *
 * This script performs deep rebranding of the IDE by:
 * 1. Replacing framework names in user-visible strings within node_modules
 * 2. Aliasing global objects to match the new brand
 * 3. Cleaning up documentation and internal references
 */

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { search, replace } of replacements) {
    if (content.includes(search)) {
      const regex =
        typeof search === 'string'
          ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          : search;
      content = content.replace(regex, replace);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

function deepRebrand() {
  console.log('=== Starting Deep Rebranding ===');

  console.log('Patching user-facing strings in core modules...');

  // Mass replacement of common phrases in the compiled JS files of the framework
  try {
    // Replace full names first
    execSync(
      `find node_modules/@theia -type f -name "*.js" -exec sed -i "s/Eclipse SkIDEancer/SkIDEancer/g" {} +`
    );
    execSync(
      `find node_modules/@theia -type f -name "*.js" -exec sed -i "s/SkIDEancer Framework/SkIDEancer Core/g" {} +`
    );
    execSync(
      `find node_modules/@theia -type f -name "*.js" -exec sed -i "s/Welcome to SkIDEancer/Welcome to SkIDEancer/g" {} +`
    );
    execSync(
      `find node_modules/@theia -type f -name "*.js" -exec sed -i "s/Powered by SkIDEancer/Powered by TNF/g" {} +`
    );

    // Target specific phrases to avoid breaking technical terms
    execSync(
      `find node_modules/@theia -type f -name "*.js" -exec sed -i "s/about SkIDEancer/about SkIDEancer/g" {} +`
    );
    execSync(
      `find node_modules/@theia -type f -name "*.js" -exec sed -i "s/SkIDEancer is/SkIDEancer is/g" {} +`
    );

    // Aggressive replacement for labels (be careful)
    // execSync(`find node_modules/@theia -type f -name "*.js" -exec sed -i "s/SkIDEancer/SkIDEancer/g" {} +`);

    console.log('Mass replacement of branding strings complete.');
  } catch (e) {
    console.warn('Warning: Mass replacement failed, skipping...');
  }

  // 2. Patch global window object in the generated entry point
  const entryPoint = path.join(__dirname, 'src-gen', 'frontend', 'index.js');
  if (fs.existsSync(entryPoint)) {
    patchFile(entryPoint, [
      {
        search: 'window.ide =',
        replace: 'window.skideancer = window.ide =',
      },
    ]);
    console.log('Patched frontend entry point with window.skideancer alias.');
  }

  console.log('=== Deep Rebranding Complete ===');
}

if (require.main === module) {
  deepRebrand();
}
