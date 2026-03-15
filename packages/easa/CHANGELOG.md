# @agentic-eng/easa

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
