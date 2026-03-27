/**
 * @agentic-eng/core
 *
 * Shared types, enums, and errors for the EASA framework.
 * This package is the foundation that all other EASA packages depend on.
 */

// Types
export type {
  Role,
  Message,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  TokenUsage,
  ReasoningAction,
  LLMReasoningResponse,
  MemoryEntry,
  IterationResult,
  ReasoningTrace,
  InvokeOptions,
  ToolInputSchema,
  ToolDefinition,
  ToolCallRequest,
  ToolResult,
} from './types';

// Errors
export {
  EasaError,
  ProviderError,
  AgentConfigError,
  MaxIterationsError,
  ReasoningParseError,
  ToolExecutionError,
} from './errors';
