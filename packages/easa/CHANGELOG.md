# @agentic-eng/easa

## 0.1.1

### Patch Changes

- deprecate: mark @agentic-eng/easa as deprecated (sunset 15 April 2026), update docs to point to @agentic-eng/agent
- Updated dependencies
  - @agentic-eng/agent@0.1.1

## 0.1.0

### Minor Changes

- 55b94b8: feat: beta release — reasoning loop, tool system, memory, event emission
  - JSON-based reasoning loop with done/continue/tool_call actions
  - Hybrid tool system: compact index + on-demand full schema injection
  - Tool interface + ToolRegistry for custom and MCP tools
  - MemoryProvider interface + FlatFileMemoryProvider (KNL DATA blocks)
  - OTEL-aligned event emission: AgentEventEmitter, ConsoleEventEmitter, NoopEventEmitter
  - 14 lifecycle event types covering full agent execution
  - Error hierarchy: ProviderError, AgentConfigError, MaxIterationsError, ReasoningParseError, ToolExecutionError
  - Streaming support via invokeStream
  - ESM + CJS dual output with full TypeScript declarations

- f6c5b05: readme update
- feat: 0.1.0 stable release — reasoning loop, tools, memory, event emission, comprehensive docs

### Patch Changes

- Updated dependencies [55b94b8]
- Updated dependencies [f6c5b05]
- Updated dependencies [4537be6]
- Updated dependencies
  - @agentic-eng/agent@0.1.0

## 0.1.0-beta.2

### Minor Changes

- readme update

### Patch Changes

- Updated dependencies
  - @agentic-eng/agent@0.1.0-beta.2

## 0.1.0-beta.1

### Minor Changes

- feat: beta release — reasoning loop, tool system, memory, event emission
  - JSON-based reasoning loop with done/continue/tool_call actions
  - Hybrid tool system: compact index + on-demand full schema injection
  - Tool interface + ToolRegistry for custom and MCP tools
  - MemoryProvider interface + FlatFileMemoryProvider (KNL DATA blocks)
  - OTEL-aligned event emission: AgentEventEmitter, ConsoleEventEmitter, NoopEventEmitter
  - 14 lifecycle event types covering full agent execution
  - Error hierarchy: ProviderError, AgentConfigError, MaxIterationsError, ReasoningParseError, ToolExecutionError
  - Streaming support via invokeStream
  - ESM + CJS dual output with full TypeScript declarations

### Patch Changes

- Updated dependencies
  - @agentic-eng/agent@0.1.0-beta.1
