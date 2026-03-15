/**
 * EASA — Easy Agent System Architecture
 *
 * Umbrella package that re-exports core primitives from all EASA packages.
 * For granular imports, use the individual packages directly (e.g. @agentic-eng/agent).
 */

// Core
export { Agent, EasaError, ProviderError, AgentConfigError } from '@agentic-eng/agent';
export type {
  AgentConfig,
  InvokeResult,
  LLMProvider,
  Role,
  Message,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  TokenUsage,
} from '@agentic-eng/agent';
