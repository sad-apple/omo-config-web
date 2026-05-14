# OMO Config Web

Web-based visual configuration tool for [Oh-My-OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent).

## Overview

OMO Config Web provides a visual, intuitive way to configure OMO's agent orchestration settings through a web interface, replacing manual JSON editing.

### Features (Planned)

- **Provider Layer**: Dynamically load and display providers from `opencode providers` command
- **Model Layer**: Browse and configure models under each provider
- **Agent/Role Layer**: Assign agents to specific providers with model routing rules
- **OMO Configuration**: Drag-and-drop agents from providers into active OMO config profiles
- **Enable/Disable**: Toggle OMO config profiles on/off and publish to opencode.json

### Tech Stack (Proposed)

- **Frontend**: Next.js + TypeScript
- **UI**: shadcn/ui + Radix UI
- **State**: Zustand
- **Drag & Drop**: dnd-kit
- **Node Editor**: React Flow (@xyflow/react)
- **JSON Editing**: Monaco Editor

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build
pnpm build
```

## License

MIT
