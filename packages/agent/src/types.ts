/**
 * Supported message roles in a conversation.
 */
export type Role = 'system' | 'user' | 'assistant';

/**
 * A single message in a conversation.
 */
export interface Message {
  role: Role;
  content: string;
}

/**
 * Options that can be passed to an LLM chat call.
 */
export interface ChatOptions {
  /** Sampling temperature (0-2). Higher = more creative. */
  temperature?: number;

  /** Maximum tokens to generate in the response. */
  maxTokens?: number;

  /** Top-p nucleus sampling. */
  topP?: number;

  /** Sequences where the model should stop generating. */
  stop?: string[];
}

/**
 * Token usage statistics from an LLM response.
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Complete response from an LLM chat call.
 */
export interface ChatResponse {
  message: Message;
  usage?: TokenUsage;
}

/**
 * A single chunk from a streaming LLM response.
 */
export interface ChatChunk {
  /** The incremental text content of this chunk. */
  delta: string;

  /** Set to true when the stream is complete. */
  done: boolean;

  /** Usage stats, typically only present on the final chunk. */
  usage?: TokenUsage;
}

// ---------------------------------------------------------------------------
// Reasoning Loop Types
// ---------------------------------------------------------------------------

/**
 * The action the LLM chooses at each reasoning step.
 * - `done` — the agent has a final answer.
 * - `continue` — the agent needs another iteration (e.g. more thinking, tool use later).
 */
export type ReasoningAction = 'done' | 'continue';

/**
 * Structured JSON the LLM must return at every reasoning step.
 * The agent's system prompt instructs the LLM to always respond in this shape.
 */
export interface LLMReasoningResponse {
  /** Whether the agent is done or needs to continue reasoning. */
  action: ReasoningAction;

  /** The agent's internal reasoning / chain-of-thought for this step. */
  reasoning: string;

  /** The content to surface — final answer when `done`, intermediate output when `continue`. */
  content: string;

  /** Optional: whether the agent wants to persist something to memory. */
  memory?: MemoryEntry;
}

/**
 * An entry the agent wants to persist to memory.
 */
export interface MemoryEntry {
  /** A short label describing this piece of knowledge. */
  label: string;

  /** The knowledge content to store. */
  content: string;

  /** Optional tags for retrieval. */
  tags?: string[];
}

/**
 * Result of a single iteration within the reasoning loop.
 */
export interface IterationResult {
  /** 1-based iteration number. */
  iteration: number;

  /** The parsed reasoning response from the LLM. */
  response: LLMReasoningResponse;

  /** Raw LLM response (for debugging / inspection). */
  rawResponse: ChatResponse;
}

/**
 * Full trace of the agent's reasoning process.
 */
export interface ReasoningTrace {
  /** All iteration results, in order. */
  iterations: IterationResult[];

  /** Whether the agent completed successfully or hit the max iteration limit. */
  completed: boolean;

  /** Total number of iterations executed. */
  totalIterations: number;
}

/**
 * Options for a single invoke/invokeStream call, extending ChatOptions.
 */
export interface InvokeOptions extends ChatOptions {
  /** Maximum number of reasoning iterations (default: 5). */
  maxIterations?: number;
}
