# The New Fuse - Theia IDE
# Cloud-based IDE with AI integrations (Anthropic, OpenAI, Ollama, HuggingFace)

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

# Install dependencies with yarn (allow scripts to run to build native modules like drivelist)
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Create plugins directories for VSCode extensions (silences startup warnings)
# Also copy index.html to lib/frontend where the static server looks for it
RUN mkdir -p plugins \
    && mkdir -p /root/.theia/plugins \
    && mkdir -p /root/.theia/deployedPlugins \
    && cp src-gen/frontend/index.html lib/frontend/ \
    && cp src-gen/frontend/secondary-window.html lib/frontend/ 2>/dev/null || true

# Set environment variables
ENV PORT=3007
ENV THEIA_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true
ENV NODE_ENV=production

# Expose port
EXPOSE 3007

# Start Theia with proper host binding
CMD ["node", "src-gen/backend/main.js", "--hostname=0.0.0.0", "--port=3007"]

