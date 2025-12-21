# The New Fuse - SkIDEancer Theia IDE
# Cloud-based IDE with AI integrations (Anthropic, OpenAI, Ollama, HuggingFace)
# Build v5: 2025-12-21T13:10:00Z

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

# Run complete Theia build
RUN yarn theia build --mode production

# CRITICAL FIX: Create the proper index.html with FrontendApplicationConfig
# The Theia CLI should generate this, but it seems to be missing
RUN cat > lib/frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#020617">
  <title>SkIDEancer - The New Fuse IDE</title>
  <link rel="icon" href="./favicon.ico" type="image/x-icon">
  <style>
    body { background-color: #020617; margin: 0; padding: 0; }
    .theia-preload {
      display: flex; justify-content: center; align-items: center;
      height: 100vh; background-color: #020617; color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .theia-preload::after { content: 'Loading SkIDEancer...'; font-size: 18px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <div class="theia-preload"></div>
  <script>
    // CRITICAL: Set frontend config BEFORE bundle.js loads
    window.theia = window.theia || {};
    window.theia.frontendApplicationConfig = {
      applicationName: 'SkIDEancer - The New Fuse IDE',
      defaultTheme: 'dark',
      defaultIconTheme: 'theia-file-icons',
      preferences: { 'files.enableTrash': false, 'security.workspace.trust.enabled': false }
    };
    if (typeof self !== 'undefined') { self.frontendApplicationConfig = window.theia.frontendApplicationConfig; }
  </script>
  <script type="text/javascript" src="./bundle.js" charset="utf-8"></script>
</body>
</html>
EOF

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
