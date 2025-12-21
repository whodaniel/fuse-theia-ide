# The New Fuse - SkIDEancer Theia IDE
# Cloud-based IDE with AI integrations (Anthropic, OpenAI, Ollama, HuggingFace)
# Build v4: 2025-12-21T12:52:00Z

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

# Copy source files ONLY (no src-gen, no lib/frontend since they're gitignored)
COPY . .

# Run complete Theia build which handles all code generation
# This regenerates src-gen AND builds the frontend bundle
RUN yarn theia build --mode production

# Verify that the generated files exist
RUN ls -la src-gen/frontend/ && ls -la lib/frontend/ | head -20

# Create plugins directories
RUN mkdir -p plugins /root/.theia/plugins /root/.theia/deployedPlugins

# Environment
ENV PORT=3007
ENV THEIA_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true
ENV NODE_ENV=production

EXPOSE 3007

# Use theia start command which properly serves the frontend
CMD ["yarn", "theia", "start", "--hostname=0.0.0.0", "--port=3007"]
