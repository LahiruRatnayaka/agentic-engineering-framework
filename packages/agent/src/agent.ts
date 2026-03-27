import {
  AgentConfigError,
  MaxIterationsError,
  ProviderError,
  ReasoningParseError,
} from '@agentic-eng/core';
import type {
  ChatChunk,
  ChatOptions,
  ChatResponse,
  InvokeOptions,
  IterationResult,
  LLMReasoningResponse,
  Message,
  ReasoningTrace,
  ToolCallRequest,
  ToolResult,
} from '@agentic-eng/core';
import type { AgentEvent, LlmProvider, MemoryProvider, ObservabilityProvider } from '@agentic-eng/provider';
import type { Tool } from '@agentic-eng/tool';
import { ToolRegistry } from '@agentic-eng/tool';
import { NoopObserver } from '@agentic-eng/observability';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_ITERATIONS = 5;

/**
 * Builds the reasoning system prompt, including the compact tool index
 * if tools are available.
 */
function buildReasoningSystemPrompt(toolIndex: string): string {
  const toolSection = toolIndex
    ? `

You have access to the following tools:
${toolIndex}

When you need to use a tool, set action to "tool_call" and provide the tool_call field.
When you set action to "tool_call", the system will inject the tool's full input schema
so you can construct the input accurately in the next step.`
    : '';

  const toolCallFormat = toolIndex
    ? `,
  "tool_call": null | { "name": "<tool_name>", "input": { ... } }`
    : '';

  const toolRules = toolIndex
    ? `
- If you need to use a tool, set action to "tool_call" and specify the tool name and input in tool_call.
- After a tool executes, you will receive its result and can continue reasoning.`
    : '';

  return `You are an AI agent. You MUST respond with valid JSON in the following format and nothing else:

{
  "action": "done" | "continue"${toolIndex ? ' | "tool_call"' : ''},
  "reasoning": "<your internal chain-of-thought for this step>",
  "content": "<the output for the user (final answer when done, intermediate when continue)>"${toolCallFormat},
  "memory": null | { "label": "<short title>", "content": "<knowledge to remember>", "tags": ["optional", "tags"] }
}${toolSection}

Rules:
- If you can answer directly, set action to "done" and provide the final answer in content.
- If you need more thinking, research, or steps, set action to "continue" and explain in reasoning what you still need.${toolRules}
- Only set memory when you discover knowledge worth persisting for future conversations.
- Always respond with valid JSON. No markdown, no code fences, no extra text.`;
}

// ---------------------------------------------------------------------------
// Config & Result types
// ---------------------------------------------------------------------------

export interface AgentConfig {
  /** Unique name identifying this agent. */
  name: string;

  /** Optional description of what this agent does. */
  description?: string;

  /** The LLM provider this agent uses for reasoning. */
  provider: LlmProvider;

  /** System prompt that defines the agent's behavior and personality. */
  systemPrompt?: string;

  /** Default chat options applied to every LLM call (can be overridden per-invoke). */
  defaultOptions?: ChatOptions;

  /** Maximum number of reasoning iterations (default: 5). */
  maxIterations?: number;

  /** Optional memory provider for persisting knowledge across invocations. */
  memory?: MemoryProvider;

  /** Optional tool registry containing tools the agent can use. */
  tools?: ToolRegistry;

  /** Optional observability provider for event emission (console logging, OTEL, etc.). */
  observability?: ObservabilityProvider;
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
 * Tools are supported via the hybrid approach:
 * - **Every call**: compact tool index (name + description only) is sent
 * - **On tool_call**: full schema for the requested tool is injected so the
 *   LLM can construct accurate inputs
 * - **After execution**: tool result is fed back as context for the next iteration
 *
 * @example
 * ```typescript
 * const tools = new ToolRegistry();
 * tools.register(calculatorTool, webSearchTool);
 *
 * const agent = new Agent({
 *   name: 'assistant',
 *   provider: myLLMProvider,
 *   systemPrompt: 'You are a helpful assistant.',
 *   tools,
 * });
 *
 * const result = await agent.invoke('What is 42 * 17?');
 * console.log(result.content);
 * ```
 */
export class Agent {
  readonly name: string;
  readonly description?: string;

  private readonly provider: LlmProvider;
  private readonly systemPrompt?: string;
  private readonly defaultOptions?: ChatOptions;
  private readonly maxIterations: number;
  private readonly memory?: MemoryProvider;
  private readonly tools?: ToolRegistry;
  private readonly emitter: ObservabilityProvider;
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
    this.tools = config.tools;
    this.emitter = config.observability ?? new NoopObserver();
  }

  /**
   * Send a prompt to the agent and run the reasoning loop until the agent
   * produces a final answer or exhausts max iterations.
   *
   * The loop handles three actions:
   * - `done` → return final answer
   * - `continue` → feed intermediate output back, next iteration
   * - `tool_call` → inject full tool schema, LLM constructs input, execute tool, feed result back
   */
  async invoke(prompt: string, options?: InvokeOptions): Promise<InvokeResult> {
    this.emit('agent.invoke.start', { prompt });
    this.messages.push({ role: 'user', content: prompt });

    const maxIter = options?.maxIterations ?? this.maxIterations;
    const iterations: IterationResult[] = [];
    let pendingToolSchema: string | undefined;

    for (let i = 1; i <= maxIter; i++) {
      this.emit('agent.iteration.start', { iteration: i, maxIterations: maxIter });

      const messagesToSend = this.buildMessages(pendingToolSchema);
      const mergedOptions = this.mergeOptions(options);
      pendingToolSchema = undefined;

      this.emit('llm.call.start', { messageCount: messagesToSend.length });

      let rawResponse: ChatResponse;
      try {
        rawResponse = await this.provider.chat(messagesToSend, mergedOptions);
      } catch (error) {
        this.emit('agent.error', { message: 'LLM provider chat call failed.', error: String(error) });
        throw new ProviderError('LLM provider chat call failed.', error);
      }

      this.emit('llm.call.end', { totalTokens: rawResponse.usage?.totalTokens });

      const parsed = this.parseReasoningResponse(rawResponse.message.content);

      const iterationResult: IterationResult = {
        iteration: i,
        response: parsed,
        rawResponse,
      };
      iterations.push(iterationResult);

      // Persist memory if the LLM requested it
      if (parsed.memory && this.memory) {
        this.emit('memory.store', { label: parsed.memory.label });
        await this.memory.store(this.name, parsed.memory);
      }

      this.emit('agent.iteration.end', { iteration: i, action: parsed.action });

      if (parsed.action === 'done') {
        // Final answer — store assistant message and return
        this.messages.push({ role: 'assistant', content: parsed.content });

        this.emit('agent.invoke.end', { totalIterations: i, completed: true });
        return {
          content: parsed.content,
          trace: { iterations, completed: true, totalIterations: i },
        };
      }

      if (parsed.action === 'tool_call' && parsed.tool_call) {
        const toolCall = parsed.tool_call;

        // Check if tool exists
        if (!this.tools || !this.tools.has(toolCall.name)) {
          this.emit('tool.not_found', {
            toolName: toolCall.name,
            availableTools: this.tools?.getCompactIndex() ?? 'none',
          });
          this.messages.push({ role: 'assistant', content: rawResponse.message.content });
          this.messages.push({
            role: 'user',
            content: `Tool "${toolCall.name}" is not available. Available tools: ${this.tools?.getCompactIndex() ?? 'none'}. Please choose a different approach.`,
          });
          continue;
        }

        // If the LLM provided input, execute the tool directly
        if (toolCall.input && Object.keys(toolCall.input).length > 0) {
          this.emit('tool.call.start', { toolName: toolCall.name, input: toolCall.input });
          const toolResult = await this.executeTool(toolCall);
          this.emit('tool.call.end', { toolName: toolCall.name, success: toolResult.success });

          this.messages.push({ role: 'assistant', content: rawResponse.message.content });
          this.messages.push({
            role: 'user',
            content: `Tool "${toolCall.name}" result:\n${JSON.stringify(toolResult, null, 2)}`,
          });
          continue;
        }

        // LLM requested a tool but didn't provide input — inject full schema
        this.emit('tool.schema.inject', { toolName: toolCall.name });
        const schema = this.tools.getFullSchema(toolCall.name);
        pendingToolSchema = schema;
        this.messages.push({ role: 'assistant', content: rawResponse.message.content });
        this.messages.push({
          role: 'user',
          content: `Here is the full schema for tool "${toolCall.name}":\n${schema}\n\nPlease provide the tool_call with the correct input.`,
        });
        continue;
      }

      // Continue — feed the intermediate output back as context for next iteration
      this.messages.push({ role: 'assistant', content: rawResponse.message.content });
      this.messages.push({
        role: 'user',
        content: `Continue. Iteration ${i} of ${maxIter}. Previous reasoning: ${parsed.reasoning}`,
      });
    }

    // Exhausted iterations
    const lastIteration = iterations[iterations.length - 1];
    const lastContent = lastIteration?.response.content ?? 'Unable to complete the task.';
    this.messages.push({ role: 'assistant', content: lastContent });

    this.emit('agent.invoke.end', { totalIterations: iterations.length, completed: false });
    this.emit('agent.error', { message: `Max iterations (${maxIter}) exceeded.` });
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
    this.emit('agent.invoke_stream.start', { prompt });
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
      this.emit('agent.error', { message: 'LLM provider stream call failed.', error: String(error) });
      throw new ProviderError('LLM provider stream call failed.', error);
    }

    this.messages.push({ role: 'assistant', content: fullContent });
    this.emit('agent.invoke_stream.end', { contentLength: fullContent.length });
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
   * Emits a lifecycle event via the configured emitter.
   */
  private emit(type: AgentEvent['type'], data: Record<string, unknown>): void {
    this.emitter.emit({
      type,
      timestamp: new Date().toISOString(),
      agentName: this.name,
      data,
    });
  }

  /**
   * Executes a tool and returns the result. Catches errors gracefully
   * so the agent can recover.
   */
  private async executeTool(toolCall: ToolCallRequest): Promise<ToolResult> {
    const tool = this.tools!.get(toolCall.name) as Tool;

    try {
      return await tool.execute(toolCall.input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        toolName: toolCall.name,
        success: false,
        output: '',
        error: message,
      };
    }
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

    if (
      obj['action'] !== 'done' &&
      obj['action'] !== 'continue' &&
      obj['action'] !== 'tool_call'
    ) {
      throw new ReasoningParseError(
        `Invalid action "${String(obj['action'])}". Must be "done", "continue", or "tool_call".`,
        raw,
      );
    }

    return {
      action: obj['action'] as 'done' | 'continue' | 'tool_call',
      reasoning: typeof obj['reasoning'] === 'string' ? obj['reasoning'] : '',
      content: typeof obj['content'] === 'string' ? obj['content'] : '',
      tool_call: this.parseToolCall(obj['tool_call']),
      memory: this.parseMemoryEntry(obj['memory']),
    };
  }

  /**
   * Parses a tool_call field from the LLM response.
   */
  private parseToolCall(raw: unknown): ToolCallRequest | undefined {
    if (!raw || typeof raw !== 'object') return undefined;

    const obj = raw as Record<string, unknown>;
    if (typeof obj['name'] !== 'string') return undefined;

    return {
      name: obj['name'],
      input:
        typeof obj['input'] === 'object' && obj['input'] !== null
          ? (obj['input'] as Record<string, unknown>)
          : {},
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
   * Builds the full message array to send to the provider.
   * Includes: reasoning system prompt (with compact tool index) → custom system prompt → conversation.
   * Optionally appends the full schema for a pending tool call.
   */
  private buildMessages(pendingToolSchema?: string): Message[] {
    const messages: Message[] = [];

    // Reasoning framework prompt (includes compact tool index if tools are registered)
    const toolIndex = this.tools?.getCompactIndex() ?? '';
    messages.push({ role: 'system', content: buildReasoningSystemPrompt(toolIndex) });

    // Then the user's custom system prompt
    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }

    messages.push(...this.messages);

    // If a tool was requested but needs full schema, append it
    if (pendingToolSchema) {
      messages.push({
        role: 'system',
        content: `Full tool schema for your tool_call:\n${pendingToolSchema}`,
      });
    }

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
