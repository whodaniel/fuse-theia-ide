# The New Fuse - SkIDEancer Theia IDE
# Build v9: 2025-12-22T19:25:00Z - Fix FrontendApplicationConfigProvider error

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
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || yarn install

# Copy source files
COPY . .

# CRITICAL: Remove ALL stale generated/built files to ensure clean regeneration
RUN rm -rf gen-webpack.config.js gen-webpack.node.config.js webpack.config.js src-gen lib/frontend lib/backend

# Run theia generate to create fresh files with correct paths
RUN echo "=== Running theia generate ===" && yarn theia generate

# Verify the generated index.js has the FrontendApplicationConfigProvider.set() call
RUN echo "=== Contents of src-gen/frontend/ ===" && ls -la src-gen/frontend/
RUN echo "=== Checking for FrontendApplicationConfigProvider.set ===" && \
    grep "FrontendApplicationConfigProvider.set" src-gen/frontend/index.js && \
    echo "FOUND FrontendApplicationConfigProvider.set()" || \
    echo "WARNING: FrontendApplicationConfigProvider.set() NOT FOUND"

# Show the config that will be set
RUN echo "=== First 30 lines of index.js ===" && head -30 src-gen/frontend/index.js

# Build the frontend bundle
RUN echo "=== Running theia build ===" && yarn theia build --mode production

# CRITICAL FIX: Copy our custom index.html that sets config BEFORE bundle.js loads
# This fixes the "The configuration is not set" error
RUN echo "=== Copying custom index.html to lib/frontend ===" && \
    cp static/index.html lib/frontend/index.html && \
    echo "Custom index.html installed successfully"

# Verify the fix is in place
RUN echo "=== Verifying lib/frontend/index.html has config ===" && \
    grep "theia.frontend.config" lib/frontend/index.html && \
    echo "SUCCESS: index.html contains frontend config setup"

# Create plugins directories
RUN mkdir -p plugins /root/.theia/plugins /root/.theia/deployedPlugins

# Environment
ENV PORT=3007
ENV THEIA_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true
ENV NODE_ENV=production

EXPOSE 3007

CMD ["yarn", "theia", "start", "--hostname=0.0.0.0", "--port=3007"]
