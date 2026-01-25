# SkIDEancer - The New Fuse AI-Powered Cloud IDE
# Build v13: 2025-12-25 - Full SkIDEancer rebranding

FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    libsecret-1-0 \
    curl \
    python3 \
    make \
    g++ \
    pkg-config \
    libx11-dev \
    libxkbfile-dev \
    && rm -rf /var/lib/apt/lists/*

RUN yarn --version

WORKDIR /app

# Copy package files first
COPY package.json .
COPY yarn.lock* .

# Copy local packages required for install
COPY packages ./packages

# Install dependencies (yarn.lock will be generated if not present)
RUN yarn install --production=false

# Copy source files
COPY . .

# Build sub-packages
RUN cd packages/skideancer-ai-agent && yarn install && yarn build

# CRITICAL: Remove ALL stale generated/built files to ensure clean regeneration
RUN rm -rf gen-webpack.config.js gen-webpack.node.config.js webpack.config.js src-gen lib/frontend lib/backend

# === PHASE 1: Pre-build patches ===
# Patch IDE core to use Symbol.for BEFORE generating/building
# This ensures the Symbol key is global across all module instances
RUN echo "=== PHASE 1: Patching IDE core source to use Symbol.for ===" && \
    find node_modules/@theia -name "*.js" -exec grep -l "Symbol('FrontendApplicationConfigProvider')" {} \; 2>/dev/null | while read f; do \
        echo "Patching: $f"; \
        sed -i "s/Symbol('FrontendApplicationConfigProvider')/Symbol.for('FrontendApplicationConfigProvider')/g" "$f"; \
    done && \
    echo "Phase 1 complete"

# Run IDE generate to create fresh files with correct paths
RUN echo "=== Running IDE generate ===" && yarn ide generate

# === PHASE 1.5: Deep Rebranding ===
RUN echo "=== Running deep rebranding patch ===" && node branding-patch.js

# === PHASE 2: Post-generate patches ===
# Patch the generated entry point to use Symbol.for
RUN echo "=== PHASE 2: Patching generated entry point ===" && \
    if [ -f src-gen/frontend/index.js ]; then \
        sed -i "s/Symbol('FrontendApplicationConfigProvider')/Symbol.for('FrontendApplicationConfigProvider')/g" src-gen/frontend/index.js; \
        echo "Patched src-gen/frontend/index.js"; \
    fi

# Verify the generated index.js has the FrontendApplicationConfigProvider.set() call
RUN echo "=== Checking for FrontendApplicationConfigProvider.set ===" && \
    grep "FrontendApplicationConfigProvider.set" src-gen/frontend/index.js && \
    echo "FOUND FrontendApplicationConfigProvider.set()" || \
    echo "WARNING: FrontendApplicationConfigProvider.set() NOT FOUND"

# Show what will be bundled
RUN echo "=== First 50 lines of index.js ===" && head -50 src-gen/frontend/index.js

# Build the frontend bundle
RUN echo "=== Running IDE build ===" && yarn run ide:build

# === PHASE 3: Post-build patches ===
# Patch the compiled bundle to ensure Symbol.for is used everywhere
RUN echo "=== PHASE 3: Patching compiled bundles ===" && \
    if [ -f lib/frontend/bundle.js ]; then \
        sed -i "s/Symbol('FrontendApplicationConfigProvider')/Symbol.for('FrontendApplicationConfigProvider')/g" lib/frontend/bundle.js; \
        PATCHES=$(grep -c "Symbol.for('FrontendApplicationConfigProvider')" lib/frontend/bundle.js || echo "0"); \
        echo "Patched lib/frontend/bundle.js - found $PATCHES instances of Symbol.for"; \
    fi && \
    for f in lib/frontend/*.js; do \
        if [ -f "$f" ]; then \
            sed -i "s/Symbol('FrontendApplicationConfigProvider')/Symbol.for('FrontendApplicationConfigProvider')/g" "$f" 2>/dev/null || true; \
        fi; \
    done && \
    echo "Phase 3 complete"

# Verify build completed successfully
RUN echo "=== Verifying build outputs ===" && \
    ls -la src-gen/backend/ && \
    ls -la src-gen/frontend/ && \
    ls -la lib/frontend/ 2>/dev/null || echo "lib/frontend not found" && \
    test -f src-gen/backend/main.js && echo "✓ Backend main.js exists" && \
    test -f src-gen/frontend/index.html && echo "✓ Frontend index.html exists" || \
    (echo "ERROR: Build verification failed!" && exit 1)

# Create plugins directories
RUN mkdir -p plugins /root/.theia/plugins /root/.theia/deployedPlugins

# Pre-install The New Fuse extension
COPY plugins/the-new-fuse.vsix /root/.theia/plugins/the-new-fuse.vsix
COPY plugins/the-new-fuse.vsix /app/plugins/the-new-fuse.vsix

# Environment
ENV PORT=3007
ENV IDE_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true
ENV NODE_ENV=production

EXPOSE 3007

# Use environment variable for port to match Railway config
CMD ["/bin/sh", "-c", "echo 'Starting SkIDEancer on port '${PORT:-3007} && node src-gen/backend/main.js --hostname 0.0.0.0 --port ${PORT:-3007}"]
