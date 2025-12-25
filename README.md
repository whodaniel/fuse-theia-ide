# The New Fuse - Theia IDE

Cloud-based IDE with full AI integrations for The New Fuse platform.

## Features

- 🤖 **AI Integrations**

  - Anthropic Claude (`@theia/ai-anthropic`)
  - OpenAI GPT (`@theia/ai-openai`)
  - Ollama (local models) (`@theia/ai-ollama`)
  - HuggingFace (`@theia/ai-huggingface`)
  - AI Chat interface (`@theia/ai-chat`)

- 📝 **Monaco Editor** - VSCode-quality editing experience
- 🔌 **VSCode Extension Compatibility** - Install extensions from Open VSX
- 🖥️ **Terminal** - Integrated terminal
- 🐙 **Git Integration** - Full git support
- 🔍 **Search** - Workspace-wide search
- 🐛 **Debug** - Debug adapter protocol support
- 📡 **MCP Integration** - Model Context Protocol for AI tools

## Quick Start

### Local Development

```bash
# Install dependencies (requires Yarn)
yarn install

# Start development server
yarn dev

# Production start
yarn start
```

### Environment Variables

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
HUGGINGFACE_API_KEY=hf_...

# Ollama (if using local models)
OLLAMA_HOST=http://localhost:11434

# TNF Integration
CLOUD_SANDBOX_URL=https://tnf-cloud-sandbox-production.up.railway.app
CLOUD_SANDBOX_WS=wss://tnf-cloud-sandbox-production.up.railway.app/ws

# Server
PORT=3007
```

## Railway Deployment

This repository is configured for Railway deployment:

1. Connect this repo to Railway
2. Set environment variables
3. Deploy

The `Dockerfile` handles everything.

## Architecture

```
fuse-theia-ide/
├── src-gen/
│   ├── backend/
│   │   └── server.js       # Theia backend server
│   └── frontend/
│       └── index.html      # Theia frontend
├── lib/                    # Pre-compiled Theia modules
├── static/                 # Static assets
├── plugins/                # VSCode-compatible plugins
├── Dockerfile              # Railway deployment
├── package.json            # Yarn-based dependencies
└── webpack.config.js       # Webpack configuration
```

## Integration with TNF Ecosystem

This IDE is part of The New Fuse platform:

- **Main Monorepo**: [whodaniel/fuse](https://github.com/whodaniel/fuse) (pnpm)
- **Theia IDE**: This repository (yarn)
- **Cloud Sandbox**: MCP tools server

### Why Separate Repository?

Theia requires Yarn while the main monorepo uses pnpm. Mixing package managers causes:

- Lockfile conflicts
- Build script confusion
- CI/CD complexity

Separating ensures clean builds for both projects.

## Troubleshooting

### 502 Bad Gateway on Railway

**Symptoms:** Deployment shows "success" but accessing the URL returns 502 Bad Gateway.

**Root Causes & Solutions:**

1. **Wrong start command** - Railway may be configured with `server.js` instead of `main.js`

   The correct production entry point is `node src-gen/backend/main.js`, not `yarn theia start`.

   Fix: Remove any custom start command in Railway settings, or update it to:

   ```bash
   node src-gen/backend/main.js --hostname 0.0.0.0 --port $PORT
   ```

2. **Port binding** - Ensure the app binds to `0.0.0.0`, not `localhost`

   Fix: The `--hostname 0.0.0.0` flag is required for Railway to route traffic.

### "The configuration is not set" Frontend Error

**Symptom:** Console shows `Error: The configuration is not set. Did you call FrontendApplicationConfigProvider#set?`

**Root Cause:** This is a Theia singleton pattern issue when webpack bundles create multiple copies of the config provider module. Using `Symbol('...')` creates unique symbols per module instance, breaking the singleton.

**Solution:** The Dockerfile includes a three-phase patching system:

1. **Phase 1 (Pre-build)**: Patches all `@theia` source files to use `Symbol.for()` instead of `Symbol()`
2. **Phase 2 (Post-generate)**: Patches `src-gen/frontend/index.js`
3. **Phase 3 (Post-build)**: Patches compiled `lib/frontend/*.js` bundles

`Symbol.for('FrontendApplicationConfigProvider')` returns the same global symbol across all module instances, preserving the singleton pattern.

### Deploy Logs Show Only "Starting Container"

This indicates the container exits immediately after starting. Common causes:

1. **Missing file**: The entry point file doesn't exist (e.g., wrong path in CMD)
2. **Crash on startup**: Check for Node.js errors
3. **Environment variable issues**: Ensure `PORT` is set correctly

### Slow Startup Warnings

`DefaultMessagingService.initialize took longer than expected` warnings are normal for Theia. The backend is fully functional despite these warnings.

## Version

- Theia: 1.67.0
- MCP SDK: 1.16.0
- Node.js: 22 (via Dockerfile)

## Changelog

### v12 (2025-12-25)

- Fixed 502 Bad Gateway by using correct production entry point (`main.js`)
- Added three-phase `Symbol.for` patching for FrontendApplicationConfigProvider
- Comprehensive troubleshooting documentation

### v11

- Initial attempted fix for startup command

### v10

- Initial Symbol.for patch (single file only)

## License

MIT - Part of The New Fuse project
