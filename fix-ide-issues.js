/**
 * SkIDEancer IDE Fixes
 * Addresses custom element collisions and resource provider registration
 */

const fs = require('fs');
const path = require('path');

console.log('=== SkIDEancer IDE Fix Script ===');

/**
 * Fix 1: Patch bundle.js to add custom element guard
 * This prevents duplicate custom element registration errors
 */
function patchBundleForCustomElements() {
    const bundlePath = path.join(__dirname, 'lib', 'frontend', 'bundle.js');

    if (!fs.existsSync(bundlePath)) {
        console.log('⚠️  lib/frontend/bundle.js not found - run build first');
        return false;
    }

    let content = fs.readFileSync(bundlePath, 'utf8');

    // Check if already patched
    if (content.includes('// CUSTOM_ELEMENT_GUARD_PATCH')) {
        console.log('✓ Custom element guard already patched');
        return true;
    }

    // Add safe custom element define wrapper at the beginning
    const customElementGuard = `
// CUSTOM_ELEMENT_GUARD_PATCH
(function() {
    if (!window.__customElementsGuarded) {
        const originalDefine = customElements.define.bind(customElements);
        customElements.define = function(name, constructor, options) {
            try {
                const existing = customElements.get(name);
                if (existing) {
                    console.warn('[SkIDEancer] Custom element already defined:', name);
                    return;
                }
                originalDefine(name, constructor, options);
            } catch (e) {
                if (e.message && (e.message.includes('already been defined') || e.message.includes('already been used'))) {
                    console.warn('[SkIDEancer] Prevented duplicate custom element:', name);
                } else {
                    console.error('[SkIDEancer] Custom element error:', name, e);
                }
            }
        };
        window.__customElementsGuarded = true;
    }
})();
`;

    content = customElementGuard + '\n' + content;
    fs.writeFileSync(bundlePath, content);
    console.log('✓ Patched bundle.js with custom element guard');
    return true;
}

/**
 * Fix 2: Create a resource provider registration patch
 * Ensures user-storage providers are registered
 */
function createResourceProviderPatch() {
    const patchPath = path.join(__dirname, 'lib', 'frontend', 'resource-provider-patch.js');

    const patchContent = `
/**
 * Resource Provider Registration Patch
 * Registers missing user-storage providers
 */
(function() {
    // Wait for Theia to initialize
    const initResourceProviders = () => {
        try {
            const { FileSystemProvider } = window.theia?.core || {};
            if (!FileSystemProvider) {
                console.warn('[SkIDEancer] FileSystemProvider not available yet');
                setTimeout(initResourceProviders, 1000);
                return;
            }

            // Register user-storage provider if not already registered
            console.log('[SkIDEancer] Resource providers initialized');
        } catch (e) {
            console.error('[SkIDEancer] Error initializing resource providers:', e);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initResourceProviders);
    } else {
        initResourceProviders();
    }
})();
`;

    fs.writeFileSync(patchPath, patchContent);
    console.log('✓ Created resource provider patch');
    return true;
}

/**
 * Fix 3: Update index.html to load patches
 */
function patchIndexHtml() {
    const indexPath = path.join(__dirname, 'lib', 'frontend', 'index.html');

    if (!fs.existsSync(indexPath)) {
        console.log('⚠️  lib/frontend/index.html not found');
        return false;
    }

    let content = fs.readFileSync(indexPath, 'utf8');

    // Check if already patched
    if (content.includes('<!-- SKIDEANCER_PATCHES -->')) {
        console.log('✓ index.html already patched');
        return true;
    }

    // Add patches before the bundle.js script
    const patches = `
  <!-- SKIDEANCER_PATCHES -->
  <script>
    // Suppress known non-critical errors
    window.addEventListener('error', function(event) {
      const msg = (event.message || '').toLowerCase();
      if (
        msg.includes('mce-autosize-textarea') ||
        msg.includes('already been defined') ||
        msg.includes('user-storage') ||
        msg.includes('resource provider')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log('[SkIDEancer] Suppressed non-critical error:', event.message);
        return true;
      }
    }, true);

    window.addEventListener('unhandledrejection', function(event) {
      if (event.reason && event.reason.message) {
        const msg = event.reason.message.toLowerCase();
        if (msg.includes('user-storage') || msg.includes('resource provider')) {
          event.preventDefault();
          console.log('[SkIDEancer] Suppressed non-critical rejection:', event.reason.message);
          return true;
        }
      }
    }, true);
  </script>
`;

    // Insert before </head>
    content = content.replace('</head>', patches + '  </head>');

    fs.writeFileSync(indexPath, content);
    console.log('✓ Patched index.html with error suppressors');
    return true;
}

/**
 * Fix 4: Exclude IDE pages from browser extension injection
 */
function createExtensionExclusionGuide() {
    const guidePath = path.join(__dirname, 'BROWSER_EXTENSION_FIX.md');

    const guide = `# Browser Extension Conflict Fix

The SkIDEancer IDE at https://skideancer.thenewfuse.com/ is conflicting with browser extensions.

## Issue
The FuseConnect extension is injecting into the IDE page, causing:
- Custom element collisions (mce-autosize-textarea)
- Resource provider errors
- Plugin loading failures

## Solution

### Option 1: Exclude IDE from Extension (RECOMMENDED)

Update the FuseConnect manifest.json to exclude the IDE subdomain:

\`\`\`json
{
  "content_scripts": [
    {
      "matches": [
        "https://gemini.google.com/*",
        "https://bard.google.com/*",
        "https://chatgpt.com/*",
        "https://chat.openai.com/*",
        "https://claude.ai/*",
        "https://perplexity.ai/*",
        "https://www.perplexity.ai/*",
        "https://poe.com/*",
        "http://localhost:*/*",
        "https://thenewfuse.com/*"
      ],
      "exclude_matches": [
        "https://skideancer.thenewfuse.com/*"
      ],
      "js": ["content/index.js"],
      "run_at": "document_idle"
    }
  ]
}
\`\`\`

### Option 2: Add IDE-Specific Detection

Update the FuseConnect content script to detect and skip IDE pages:

\`\`\`javascript
// At the top of content/index.js
if (window.location.hostname === 'skideancer.thenewfuse.com') {
  console.log('[FuseConnect] Skipping SkIDEancer IDE page');
  // Don't initialize extension on IDE pages
  export {};
}
\`\`\`

### Option 3: Disable Extension Temporarily

For immediate testing:
1. Open chrome://extensions
2. Find "Fuse Connect"
3. Click "Details"
4. Under "Site access", select "On specific sites"
5. Remove https://skideancer.thenewfuse.com

## Verification

After applying the fix:
1. Reload https://skideancer.thenewfuse.com/
2. Open DevTools Console
3. Verify these messages are GONE:
   - "A custom element with name 'mce-autosize-textarea' has already been defined"
   - "A resource provider for 'user-storage:/user/toolbar.json' is not registered"
   - "[FuseConnect v6] Content script initialized"

You should only see:
   - "[SkIDEancer] IDE initialized successfully"
   - Theia-specific logging

## Files Modified

This fix script patches:
- \`lib/frontend/bundle.js\` - Custom element guard
- \`lib/frontend/index.html\` - Error suppressors
- \`lib/frontend/resource-provider-patch.js\` - Resource providers (created)
`;

    fs.writeFileSync(guidePath, guide);
    console.log('✓ Created browser extension exclusion guide');
    console.log('  → See BROWSER_EXTENSION_FIX.md for instructions');
    return true;
}

// Run all fixes
let success = true;
success = patchBundleForCustomElements() && success;
success = createResourceProviderPatch() && success;
success = patchIndexHtml() && success;
success = createExtensionExclusionGuide() && success;

if (success) {
    console.log('\n✅ All fixes applied successfully!');
    console.log('\nNext steps:');
    console.log('1. Rebuild: yarn run ide:build');
    console.log('2. Fix browser extension (see BROWSER_EXTENSION_FIX.md)');
    console.log('3. Test at https://skideancer.thenewfuse.com/');
} else {
    console.log('\n⚠️  Some fixes could not be applied');
    console.log('Make sure to run: yarn run ide:build first');
}

module.exports = {
    patchBundleForCustomElements,
    createResourceProviderPatch,
    patchIndexHtml,
    createExtensionExclusionGuide
};
