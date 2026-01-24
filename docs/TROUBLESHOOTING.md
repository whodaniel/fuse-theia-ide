# SkIDEancer (SkIDEancer IDE) - Deployment Troubleshooting Guide

This document covers common deployment issues and their solutions for the fuse-ide-ide Railway deployment.

## Issue Summary (December 2025)

### The Problem

After deploying to Railway, the application returned a **502 Bad Gateway** error, followed by a **frontend configuration error** in the browser console.

### Root Causes Identified

1. **502 Bad Gateway**: The start command was using `yarn ide start` (development helper) instead of `node src-gen/backend/main.js` (production entry point)

2. **FrontendApplicationConfigProvider Error**: Webpack bundling creates multiple copies of modules, and core's singleton pattern using `Symbol('...')` creates unique symbols per module instance, breaking the pattern.

---

## Solution Details

### Fix 1: Correct Production Entry Point

**Problem**: `yarn ide start` is a development server helper that may not work correctly with pre-built artifacts.

**Solution**: Use Node.js directly with the compiled backend entry point:

```dockerfile
CMD ["/bin/sh", "-c", "node src-gen/backend/main.js --hostname 0.0.0.0 --port ${PORT:-3007}"]
```

Key points:

- `main.js` is the production entry point (not `server.js`)
- `--hostname 0.0.0.0` is required for Railway to route external traffic
- `$PORT` is dynamically set by Railway

### Fix 2: Three-Phase Symbol.for Patching

**Problem**: The error `The configuration is not set. Did you call FrontendApplicationConfigProvider#set?` occurs because:

1. Webpack bundles may include multiple copies of the config provider module
2. `Symbol('FrontendApplicationConfigProvider')` creates a unique symbol for each copy
3. Module load order causes `.get()` to be called before `.set()` executes on the "correct" instance

**Solution**: Replace `Symbol('...')` with `Symbol.for('...')` which returns the same global symbol regardless of how many module copies exist.

The Dockerfile implements a three-phase patching approach:

```dockerfile
# PHASE 1: Patch all @ide source files BEFORE generate/build
RUN find node_modules/@ide -name "*.js" -exec grep -l "Symbol('FrontendApplicationConfigProvider')" {} \; | while read f; do \
    sed -i "s/Symbol('FrontendApplicationConfigProvider')/Symbol.for('FrontendApplicationConfigProvider')/g" "$f"; \
done

# PHASE 2: Patch generated entry point
RUN sed -i "s/Symbol('FrontendApplicationConfigProvider')/Symbol.for('FrontendApplicationConfigProvider')/g" src-gen/frontend/index.js

# PHASE 3: Patch compiled bundles
RUN for f in lib/frontend/*.js; do \
    sed -i "s/Symbol('FrontendApplicationConfigProvider')/Symbol.for('FrontendApplicationConfigProvider')/g" "$f"; \
done
```

Why three phases?

- Phase 1 catches the source before it's processed
- Phase 2 catches the generated entry point
- Phase 3 catches anything in the final webpack bundle output

---

## Debugging Commands

### Check Deploy Logs in Railway Dashboard

1. Go to your service in Railway
2. Click on the deployment
3. Switch from "Build Logs" to "Deploy Logs"
4. Look for error messages after "Starting Container"

### Verify Build Outputs

During build, these files should exist:

- `src-gen/backend/main.js` - Backend entry point
- `src-gen/frontend/index.html` - Frontend entry point
- `lib/frontend/bundle.js` - Webpack bundle

### Test Locally

```bash
# Install dependencies
yarn install

# Generate IDE
yarn ide generate

# Build
yarn ide build --mode production

# Run
node src-gen/backend/main.js --hostname 0.0.0.0 --port 3007
```

---

## Railway Configuration

### Required Environment Variables

```
PORT=3007  # Railway will override this dynamically
NODE_ENV=production
```

### railway.toml

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
# No healthcheck - SkIDEancer takes a while to start
```

### Important: Don't Set Custom Start Command

If Railway has a custom start command configured in the service settings, it will **override** the Dockerfile CMD. Either:

- Remove the custom start command entirely (recommended)
- Or set it to: `node src-gen/backend/main.js --hostname=0.0.0.0 --port=$PORT`

---

## Version History

| Version | Date       | Changes                                                            |
| ------- | ---------- | ------------------------------------------------------------------ |
| v12     | 2025-12-25 | Fixed 502 with main.js entry point; Added 3-phase Symbol.for patch |
| v11     | 2025-12-25 | First attempt at main.js fix                                       |
| v10     | 2025-12-22 | Single-file Symbol.for patch (insufficient)                        |

---

## References

- [IDE Framework](https://ide-ide.org/)
- [Railway Documentation](https://docs.railway.app/)
- [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/)
- [JavaScript Symbol.for()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/for)
