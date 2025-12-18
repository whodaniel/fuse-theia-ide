# The New Fuse - Theia IDE
# Cloud-based IDE with AI integrations (Anthropic, OpenAI, Ollama, HuggingFace)

FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

# Install yarn globally
RUN npm install -g yarn

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock* ./

# Install dependencies with yarn
RUN yarn install --frozen-lockfile || yarn install

# Copy the rest of the application
COPY . .

# Create plugins directory for VSCode extensions
RUN mkdir -p plugins

# Set environment variables
ENV PORT=3007
ENV THEIA_MINI_BROWSER=0
ENV USE_LOCAL_GIT=true

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:3007/ || exit 1

# Start Theia with proper host binding
CMD ["node", "src-gen/backend/server.js", "--hostname=0.0.0.0", "--port=3007"]
