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

## Version

- Theia: 1.59.0
- MCP SDK: 1.16.0

## License

MIT - Part of The New Fuse project
# Force rebuild Sat Dec 20 20:55:53 EST 2025
