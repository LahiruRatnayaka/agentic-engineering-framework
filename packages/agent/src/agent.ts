import {
  AgentConfigError,
  MaxIterationsError,
  ProviderError,
  ReasoningParseError,
} from './errors';
import type { MemoryProvider } from './memory';
import type { LLMProvider } from './provider';
import type {
  ChatChunk,
  ChatOptions,
  ChatResponse,
  InvokeOptions,
  IterationResult,
  LLMReasoningResponse,
  Message,
  ReasoningTrace,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_ITERATIONS = 5;

/**
 * The system-level prompt fragment that instructs the LLM to respond in
 * structured JSON for the reasoning loop.
 */
const REASONING_SYSTEM_PROMPT = `You are an AI agent. You MUST respond with valid JSON in the following format and nothing else:

{
  "action": "done" | "continue",
  "reasoning": "<your internal chain-of-thought for this step>",
  "content": "<the output for the user (final answer when done, intermediate when continue)>",
  "memory": null | { "label": "<short title>", "content": "<knowledge to remember>", "tags": ["optional", "tags"] }
}

Rules:
- If you can answer directly, set action to "done" and provide the final answer in content.
- If you need more thinking, research, or steps, set action to "continue" and explain in reasoning what you still need.
- Only set memory when you discover knowledge worth persisting for future conversations.
- Always respond with valid JSON. No markdown, no code fences, no extra text.`;

// ---------------------------------------------------------------------------
// Config & Result types
// ---------------------------------------------------------------------------

export interface AgentConfig {
  /** Unique name identifying this agent. */
  name: string;

  /** Optional description of what this agent does. */
  description?: string;

  /** The LLM provider this agent uses for reasoning. */
  provider: LLMProvider;

  /** System prompt that defines the agent's behavior and personality. */
  systemPrompt?: string;

  /** Default chat options applied to every LLM call (can be overridden per-invoke). */
  defaultOptions?: ChatOptions;

  /** Maximum number of reasoning iterations (default: 5). */
  maxIterations?: number;

  /** Optional memory provider for persisting knowledge across invocations. */
  memory?: MemoryProvider;
}

/**
 * The result returned by `agent.invoke()`.
 */
export interface InvokeResult {
  /** The final response content from the agent. */
  content: string;

  /** Full reasoning trace (all iterations). */
  trace: ReasoningTrace;
}

/**
 * Core Agent class — the fundamental building block of EASA.
 *
 * An Agent wraps an LLM provider with a reasoning loop that can iterate
 * toward a goal. Simple prompts resolve in one step; complex tasks may
 * take multiple iterations with the LLM deciding when it's done.
 *
 * @example
 * ```typescript
 * const agent = new Agent({
 *   name: 'assistant',
 *   provider: myLLMProvider,
 *   systemPrompt: 'You are a helpful travel planner.',
 * });
 *
 * // Simple — resolves in 1 iteration
 * const result = await agent.invoke('Hello!');
 * console.log(result.content);
 *
 * // Complex — may take multiple iterations
 * const plan = await agent.invoke('Plan my trip to Thailand for 10 days');
 * console.log(plan.content);
 * console.log(`Completed in ${plan.trace.totalIterations} iterations`);
 *
 * // Streaming
 * for await (const chunk of agent.invokeStream('Tell me a story.')) {
 *   process.stdout.write(chunk.delta);
 * }
 * ```
 */
export class Agent {
  readonly name: string;
  readonly description?: string;

  private readonly provider: LLMProvider;
  private readonly systemPrompt?: string;
  private readonly defaultOptions?: ChatOptions;
  private readonly maxIterations: number;
  private readonly memory?: MemoryProvider;
  private messages: Message[] = [];

  constructor(config: AgentConfig) {
    if (!config.name || config.name.trim().length === 0) {
      throw new AgentConfigError('Agent name is required and cannot be empty.');
    }

    if (!config.provider) {
      throw new AgentConfigError('Agent requires an LLM provider.');
    }

    this.name = config.name;
    this.description = config.description;
    this.provider = config.provider;
    this.systemPrompt = config.systemPrompt;
    this.defaultOptions = config.defaultOptions;
    this.maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    this.memory = config.memory;
  }

  /**
   * Send a prompt to the agent and run the reasoning loop until the agent
   * produces a final answer or exhausts max iterations.
   */
  async invoke(prompt: string, options?: InvokeOptions): Promise<InvokeResult> {
    this.messages.push({ role: 'user', content: prompt });

    const maxIter = options?.maxIterations ?? this.maxIterations;
    const iterations: IterationResult[] = [];

    for (let i = 1; i <= maxIter; i++) {
      const messagesToSend = this.buildMessages();
      const mergedOptions = this.mergeOptions(options);

      let rawResponse: ChatResponse;
      try {
        rawResponse = await this.provider.chat(messagesToSend, mergedOptions);
      } catch (error) {
        throw new ProviderError('LLM provider chat call failed.', error);
      }

      const parsed = this.parseReasoningResponse(rawResponse.message.content);

      const iterationResult: IterationResult = {
        iteration: i,
        response: parsed,
        rawResponse,
      };
      iterations.push(iterationResult);

      // Persist memory if the LLM requested it
      if (parsed.memory && this.memory) {
        await this.memory.store(this.name, parsed.memory);
      }

      if (parsed.action === 'done') {
        // Final answer — store assistant message and return
        this.messages.push({ role: 'assistant', content: parsed.content });

        return {
          content: parsed.content,
          trace: { iterations, completed: true, totalIterations: i },
        };
      }

      // Continue — feed the intermediate output back as context for next iteration
      this.messages.push({ role: 'assistant', content: rawResponse.message.content });
      this.messages.push({
        role: 'user',
        content: `Continue. Iteration ${i} of ${maxIter}. Previous reasoning: ${parsed.reasoning}`,
      });
    }

    // Exhausted iterations — return the last content with completed: false
    const lastIteration = iterations[iterations.length - 1];
    const lastContent = lastIteration?.response.content ?? 'Unable to complete the task.';

    this.messages.push({ role: 'assistant', content: lastContent });

    throw new MaxIterationsError(maxIter, iterations.length);
  }

  /**
   * Send a prompt to the agent and receive a streaming response.
   * This is a single-pass stream (no reasoning loop) — useful for
   * conversational responses where iteration is not needed.
   *
   * The assistant's full message is appended to conversation history
   * once the stream completes.
   */
  async *invokeStream(prompt: string, options?: ChatOptions): AsyncIterable<ChatChunk> {
    this.messages.push({ role: 'user', content: prompt });

    const messagesToSend = this.buildMessages();
    const mergedOptions = this.mergeOptions(options);

    let fullContent = '';

    try {
      for await (const chunk of this.provider.chatStream(messagesToSend, mergedOptions)) {
        fullContent += chunk.delta;
        yield chunk;
      }
    } catch (error) {
      throw new ProviderError('LLM provider stream call failed.', error);
    }

    this.messages.push({ role: 'assistant', content: fullContent });
  }

  /**
   * Returns a copy of the current conversation history.
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Clears the conversation history.
   */
  clearHistory(): void {
    this.messages = [];
  }

  /**
   * Parses the LLM's raw text response into a structured `LLMReasoningResponse`.
   * Attempts to extract JSON from the response, handling common LLM quirks
   * like wrapping in code fences.
   */
  private parseReasoningResponse(raw: string): LLMReasoningResponse {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new ReasoningParseError(
        `Failed to parse LLM response as JSON: ${raw.substring(0, 200)}`,
        raw,
      );
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('action' in parsed) ||
      !('content' in parsed)
    ) {
      throw new ReasoningParseError(
        'LLM response JSON is missing required fields (action, content).',
        raw,
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (obj['action'] !== 'done' && obj['action'] !== 'continue') {
      throw new ReasoningParseError(
        `Invalid action "${String(obj['action'])}". Must be "done" or "continue".`,
        raw,
      );
    }

    return {
      action: obj['action'] as 'done' | 'continue',
      reasoning: typeof obj['reasoning'] === 'string' ? obj['reasoning'] : '',
      content: typeof obj['content'] === 'string' ? obj['content'] : '',
      memory: this.parseMemoryEntry(obj['memory']),
    };
  }

  /**
   * Parses an optional memory entry from the LLM response.
   */
  private parseMemoryEntry(raw: unknown): LLMReasoningResponse['memory'] {
    if (!raw || typeof raw !== 'object') return undefined;

    const obj = raw as Record<string, unknown>;
    if (typeof obj['label'] !== 'string' || typeof obj['content'] !== 'string') {
      return undefined;
    }

    return {
      label: obj['label'],
      content: obj['content'],
      tags: Array.isArray(obj['tags'])
        ? obj['tags'].filter((t): t is string => typeof t === 'string')
        : undefined,
    };
  }

  /**
   * Builds the full message array to send to the provider,
   * prepending the system prompt if configured.
   */
  private buildMessages(): Message[] {
    const messages: Message[] = [];

    // Reasoning framework prompt always comes first
    messages.push({ role: 'system', content: REASONING_SYSTEM_PROMPT });

    // Then the user's custom system prompt
    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }

    messages.push(...this.messages);
    return messages;
  }

  /**
   * Merges per-call options with default options. Per-call options take precedence.
   */
  private mergeOptions(options?: ChatOptions): ChatOptions | undefined {
    if (!this.defaultOptions && !options) return undefined;
    return { ...this.defaultOptions, ...options };
  }
}
