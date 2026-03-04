# EASA — Easy Agent System Architecture

> A Minimal TypeScript Framework for Agent Systems.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

## Overview

EASA provides a lightweight, composable foundation for building agent-based systems in TypeScript. It focuses on simplicity, type safety, and extensibility.

## Packages

| Package | Description | Version |
| --- | --- | --- |
| [`@easa/agent`](./packages/agent) | Core agent primitives and runtime | [![npm](https://img.shields.io/npm/v/@easa/agent)](https://www.npmjs.com/package/@easa/agent) |

## Quick Start

```bash
npm install @easa/agent
# or
pnpm add @easa/agent
```

```typescript
import { Agent } from '@easa/agent';

const agent = new Agent({ name: 'my-agent' });
```

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

### Project Structure

```
easa/
├── packages/
│   └── agent/          # @easa/agent — core agent primitives
├── package.json        # Root workspace config
├── tsconfig.json       # Shared TypeScript config
└── pnpm-workspace.yaml
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

[MIT](./LICENSE)
