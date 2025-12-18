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

# Create plugins directory for VSCode extensions
RUN mkdir -p plugins

# Set environment variables
ENV PORT=3007
ENV THEIA_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true
ENV NODE_ENV=production

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:3007/ || exit 1

# Start Theia with proper host binding
CMD ["node", "src-gen/backend/server.js", "--hostname=0.0.0.0", "--port=3007"]
