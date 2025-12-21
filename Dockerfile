# The New Fuse - SkIDEancer Theia IDE
# Cloud-based IDE with AI integrations
# Build v6: 2025-12-21T13:50:00Z

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

# Copy package files first for better caching
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || yarn install

# Copy source files
COPY . .

# Run theia generate to create src-gen files (including index.js with FrontendApplicationConfigProvider.set)
RUN echo "=== Running theia generate ===" && yarn theia generate

# Show what was generated
RUN echo "=== Contents of src-gen/frontend ===" && ls -la src-gen/frontend/ && \
    echo "=== First 50 lines of src-gen/frontend/index.js ===" && head -50 src-gen/frontend/index.js

# Build the frontend bundle
RUN echo "=== Running theia build ===" && yarn theia build --mode production

# Show what was built
RUN echo "=== Contents of lib/frontend ===" && ls -la lib/frontend/ | head -20

# Create plugins directories
RUN mkdir -p plugins /root/.theia/plugins /root/.theia/deployedPlugins

# Environment
ENV PORT=3007
ENV THEIA_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true
ENV NODE_ENV=production

EXPOSE 3007

# Use theia start
CMD ["yarn", "theia", "start", "--hostname=0.0.0.0", "--port=3007"]
