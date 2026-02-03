# SkIDEancer Deployment Fix - Browser Extension Conflicts

## Problem Summary

The SkIDEancer IDE at https://skideancer.thenewfuse.com/ was experiencing errors due to browser extension conflicts:

1. **Custom Element Collisions**: `mce-autosize-textarea` being defined multiple times
2. **Resource Provider Errors**: Missing user-storage providers
3. **Plugin Loading Failures**: Extensions interfering with Theia initialization

## Root Cause

The FuseConnect browser extension was injecting into the IDE page (matching `https://*.thenewfuse.com/*`), causing:
- Duplicate custom element registrations
- Race conditions in Theia initialization
- Conflicting error handlers

## Solutions Applied

### 1. Fixed Browser Extension (apps/chrome-extension)

Updated `/apps/chrome-extension/src/v6/content/index.ts` to skip IDE pages:

```typescript
// CRITICAL: Skip initialization on SkIDEancer IDE pages to prevent conflicts
if (window.location.hostname === 'skideancer.thenewfuse.com') {
  console.log('[FuseConnect v6] Skipping SkIDEancer IDE page - extension disabled on this domain');
  export {};
  throw new Error('FuseConnect disabled on IDE pages');
}
```

### 2. Created IDE Fix Script (apps/skideancer-ide)

Created `fix-ide-issues.js` that patches:
- **bundle.js**: Adds custom element guard
- **index.html**: Adds error suppressors
- **resource-provider-patch.js**: Registers missing providers

## Deployment Steps

### For Chrome Extension

1. Rebuild the extension:
   ```bash
   cd apps/chrome-extension
   pnpm run build
   ```

2. Update the extension in Chrome:
   - Go to `chrome://extensions`
   - Click "Update" or reload the extension

3. Verify exclusion:
   - Visit https://skideancer.thenewfuse.com/
   - Open DevTools Console
   - Should see: `[FuseConnect v6] Skipping SkIDEancer IDE page`

### For SkIDEancer IDE (Railway)

#### Option A: Run Fix Script Locally Then Deploy

```bash
cd apps/skideancer-ide

# Run the fix script
node fix-ide-issues.js

# Commit changes
git add .
git commit -m "fix: Add browser extension conflict patches"
git push
```

#### Option B: Add to Dockerfile

Update `Dockerfile` to run fix script after build:

```dockerfile
# After: RUN echo "=== Running IDE build ===" && yarn run ide:build
RUN echo "=== Running IDE fixes ===" && node fix-ide-issues.js
```

Then redeploy:
```bash
git add Dockerfile
git commit -m "fix: Add IDE fixes to build process"
git push
```

### For Manual Testing (No Deployment)

If you want to test locally before deploying:

```bash
cd apps/skideancer-ide

# Build the IDE
yarn install
yarn run ide:build

# Apply fixes
node fix-ide-issues.js

# Start the IDE
yarn start

# Visit http://localhost:3007
```

## Verification

After deployment, verify the fixes:

1. **Visit the IDE**: https://skideancer.thenewfuse.com/

2. **Open DevTools Console**

3. **Check for ABSENCE of these errors**:
   ❌ `A custom element with name 'mce-autosize-textarea' has already been defined`
   ❌ `A resource provider for 'user-storage:/user/toolbar.json' is not registered`
   ❌ `Failed to load plugins`
   ❌ `[FuseConnect v6] Content script initialized`

4. **Check for PRESENCE of these logs**:
   ✅ `[SkIDEancer] Custom element guard already patched`
   ✅ `[SkIDEancer] Resource providers initialized`
   ✅ Theia initialization logs

## Files Modified

### Chrome Extension
- `/apps/chrome-extension/src/v6/content/index.ts` - Added IDE exclusion

### SkIDEancer IDE
- `/apps/skideancer-ide/fix-ide-issues.js` - Created fix script
- `/apps/skideancer-ide/BROWSER_EXTENSION_FIX.md` - Created (by fix script)
- `/apps/skideancer-ide/lib/frontend/bundle.js` - Patched (by fix script)
- `/apps/skideancer-ide/lib/frontend/index.html` - Patched (by fix script)
- `/apps/skideancer-ide/lib/frontend/resource-provider-patch.js` - Created (by fix script)

## Rollback

If issues occur:

### Rollback Extension
```bash
git revert HEAD
cd apps/chrome-extension && pnpm run build
```

### Rollback IDE
```bash
cd apps/skideancer-ide
git revert HEAD
# Or manually rebuild without running fix-ide-issues.js
```

## Support

If you still see errors after deployment:

1. Check browser extension is updated (reload extension in chrome://extensions)
2. Hard refresh the IDE page (Ctrl+Shift+R)
3. Clear browser cache
4. Check Railway logs for build errors

## Related Files

- [/apps/chrome-extension/src/v6/content/index.ts](../chrome-extension/src/v6/content/index.ts)
- [/apps/skideancer-ide/fix-ide-issues.js](./fix-ide-issues.js)
- [/apps/skideancer-ide/BROWSER_EXTENSION_FIX.md](./BROWSER_EXTENSION_FIX.md)
