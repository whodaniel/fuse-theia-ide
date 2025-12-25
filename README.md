# SkIDEancer - The New Fuse Cloud IDE

AI-powered Cloud IDE for The New Fuse platform. Full coding experience with
integrated AI assistants, code analysis, and MCP tool support.

## Features

### 🤖 AI Integrations

- **Anthropic Claude** - Advanced reasoning and code generation
- **OpenAI GPT** - GPT-4 and GPT-4.1 turbo support
- **Ollama** - Local model support for offline development
- **HuggingFace** - Open-source model access
- **AI Chat Interface** - Unified chat for all AI providers

### 💻 Development Features

- **Monaco Editor** - VSCode-quality editing experience
- **VSCode Extension Compatibility** - Install extensions from Open VSX
- **Integrated Terminal** - Full terminal with AI assistance
- **Git Integration** - Full git support with visual diff
- **Search** - Workspace-wide semantic search
- **Debug** - Debug adapter protocol support

### 🔌 TNF Ecosystem Integration

- **MCP Integration** - Model Context Protocol for AI tools
- **SkIDEancer Coder** - Built-in AI coding assistant
- **Code Analysis** - AI-powered security scanning and metrics
- **Flow Orchestration** - Automated development workflows

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
│   │   └── main.js         # Server entry point
│   └── frontend/
│       └── index.html      # Frontend entry
├── lib/                    # Compiled modules
├── static/
│   └── branding/           # SkIDEancer branding assets
├── packages/
│   └── theia-ai-agent/     # Custom AI agent package
├── plugins/                # VSCode-compatible plugins
├── defaults/
│   └── preferences.json    # Default IDE preferences
├── Dockerfile              # Railway deployment
└── package.json            # Dependencies
```

## Integration with TNF Ecosystem

SkIDEancer is part of The New Fuse platform:

- **Main Monorepo**: [whodaniel/fuse](https://github.com/whodaniel/fuse) (pnpm)
- **SkIDEancer**: This repository (yarn)
- **Cloud Sandbox**: MCP tools server

### Why Separate Repository?

The underlying framework requires Yarn while the main monorepo uses pnpm.
Separating ensures:

- Clean dependency management
- Independent deployment pipelines
- Faster CI/CD builds

## Troubleshooting

### 502 Bad Gateway on Railway

**Symptoms:** Deployment shows "success" but accessing the URL returns 502 Bad
Gateway.

**Solutions:**

1. **Start command** - Ensure Railway uses:

   ```bash
   node src-gen/backend/main.js --hostname 0.0.0.0 --port $PORT
   ```

2. **Port binding** - The app must bind to `0.0.0.0`, not `localhost`

### "The configuration is not set" Error

**Symptom:** Console shows `Error: The configuration is not set`

**Solution:** The Dockerfile includes automatic patching. If building locally,
ensure the three-phase patch runs during build.

### Slow Startup Warnings

`DefaultMessagingService.initialize took longer than expected` warnings are
normal. The backend is fully functional despite these warnings.

## Version

- SkIDEancer: v13 (2025-12-25)
- Node.js: 22 (via Dockerfile)
- MCP SDK: 1.16.0

## Changelog

### v13 (2025-12-25)

- **Full SkIDEancer rebranding** - Removed legacy naming throughout
- **Custom Deep Space theme** - TNF brand colors
- **Welcome page** - New branded welcome experience
- **AI feature prominence** - Highlighted AI capabilities

### v12 (2025-12-25)

- Fixed 502 Bad Gateway with correct production entry point
- Added three-phase config patching
- Comprehensive troubleshooting docs

### v11

- Initial startup command fix

### v10

- Initial Symbol.for patch

## License

MIT - Part of The New Fuse project

---

**SkIDEancer** | Powered by [The New Fuse](https://thenewfuse.com) 🔥
