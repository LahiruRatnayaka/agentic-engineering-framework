# @agentic-eng/agent

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
- 4537be6: feat: initial alpha release of @agentic-eng/agent with core Agent class
- feat: 0.1.0 stable release — reasoning loop, tools, memory, event emission, comprehensive docs

## 0.1.0-beta.2

### Minor Changes

- readme update

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

## 0.1.0-alpha.0

### Minor Changes

- feat: initial alpha release of @easa/agent with core Agent class
