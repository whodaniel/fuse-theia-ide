# The New Fuse - SkIDEancer Theia IDE
# Cloud-based IDE with AI integrations (Anthropic, OpenAI, Ollama, HuggingFace)
# Build timestamp: 2025-12-21T12:26:00Z (cache bust)

FROM node:22-slim

# Install system dependencies (git needed for Theia, libsecret for credential storage, build tools for native modules)
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

# Yarn is already installed in node:22-slim, just verify it works
RUN yarn --version

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock* ./

# Install dependencies with yarn
RUN yarn install --frozen-lockfile || yarn install

# Copy the rest of the application (excluding src-gen/frontend via .dockerignore)
COPY . .

# Remove any stale frontend build files and regenerate
RUN rm -rf src-gen/frontend lib/frontend

# Generate Theia backend and frontend code, then build
RUN npx theia generate && npx theia build --mode production

# Create plugins directories for VSCode extensions (silences startup warnings)
RUN mkdir -p plugins \
    && mkdir -p /root/.theia/plugins \
    && mkdir -p /root/.theia/deployedPlugins

# Set environment variables
ENV PORT=3007
ENV THEIA_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true
ENV NODE_ENV=production

# Expose port
EXPOSE 3007

# Start Theia with proper host binding
CMD ["node", "src-gen/backend/main.js", "--hostname=0.0.0.0", "--port=3007"]
