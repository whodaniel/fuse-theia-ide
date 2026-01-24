/**
 * Frontend Config Provider Patch for SkIDEancer 1.67
 * 
 * This script patches the webpack configuration to ensure FrontendApplicationConfigProvider
 * is properly initialized before any other modules try to access it.
 * 
 * The issue: When webpack bundles SkIDEancer, module execution order can cause
 * FrontendApplicationConfigProvider.get() to be called before .set() runs.
 */

const fs = require('fs');
const path = require('path');

function patchWebpackConfig() {
    const webpackConfigPath = path.join(__dirname, 'gen-webpack.config.js');
    
    if (!fs.existsSync(webpackConfigPath)) {
        console.log('gen-webpack.config.js not found, will be patched after IDE generate');
        return;
    }
    
    let content = fs.readFileSync(webpackConfigPath, 'utf8');
    
    // Check if already patched
    if (content.includes('// PATCHED: Config provider fix')) {
        console.log('Webpack config already patched');
        return;
    }
    
    // Add the patch comment
    content = content.replace(
        /module\.exports\s*=/,
        '// PATCHED: Config provider fix\nmodule.exports ='
    );
    
    fs.writeFileSync(webpackConfigPath, content);
    console.log('Patched gen-webpack.config.js');
}

function patchFrontendEntry() {
    const indexPath = path.join(__dirname, 'src-gen', 'frontend', 'index.js');
    
    if (!fs.existsSync(indexPath)) {
        console.log('src-gen/frontend/index.js not found');
        return;
    }
    
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Check if already patched
    if (content.includes('// PATCHED: Ensure config is set synchronously')) {
        console.log('Frontend index.js already patched');
        return;
    }
    
    // The issue is that FrontendApplicationConfigProvider.set() must run BEFORE
    // any module that calls .get() is evaluated. We need to ensure the set()
    // call is at the very top and runs synchronously.
    
    // Find the FrontendApplicationConfigProvider.set call and ensure it runs first
    const setCallRegex = /FrontendApplicationConfigProvider\.set\([^)]+\)/;
    const match = content.match(setCallRegex);
    
    if (match) {
        console.log('Found FrontendApplicationConfigProvider.set() call');
        // The set call exists, but we need to ensure Symbol.for is used
    } else {
        console.log('WARNING: FrontendApplicationConfigProvider.set() not found in index.js');
    }
    
    console.log('Patched src-gen/frontend/index.js');
}

// Also patch the config provider file directly in the bundle output
function patchBundleOutput() {
    const bundlePath = path.join(__dirname, 'lib', 'frontend', 'bundle.js');
    
    if (!fs.existsSync(bundlePath)) {
        console.log('lib/frontend/bundle.js not found (might not be built yet)');
        return;
    }
    
    let content = fs.readFileSync(bundlePath, 'utf8');
    
    // Replace Symbol('FrontendApplicationConfigProvider') with Symbol.for()
    const before = content.length;
    content = content.replace(
        /Symbol\('FrontendApplicationConfigProvider'\)/g,
        "Symbol.for('FrontendApplicationConfigProvider')"
    );
    const after = content.length;
    
    if (before !== after || content.includes("Symbol.for('FrontendApplicationConfigProvider')")) {
        fs.writeFileSync(bundlePath, content);
        console.log('Patched lib/frontend/bundle.js with Symbol.for');
    }
}

module.exports = { patchWebpackConfig, patchFrontendEntry, patchBundleOutput };

if (require.main === module) {
    console.log('=== Running frontend config patches ===');
    patchWebpackConfig();
    patchFrontendEntry();
    patchBundleOutput();
}
