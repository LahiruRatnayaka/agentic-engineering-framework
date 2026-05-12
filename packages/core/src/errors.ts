/**
 * Base error class for all framework errors.
 */
export class AgenticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgenticError';
  }
}

/**
 * @deprecated Use `AgenticError` instead. Will be removed after 31 May 2026.
 */
export const EasaError = AgenticError;

/**
 * Thrown when an LLM provider encounters an error.
 */
export class ProviderError extends AgenticError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Thrown when the Agent is misconfigured (e.g. missing provider).
 */
export class AgentConfigError extends AgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'AgentConfigError';
  }
}

/**
 * Thrown when the agent's reasoning loop exceeds the maximum allowed iterations.
 */
export class MaxIterationsError extends AgenticError {
  constructor(
    public readonly maxIterations: number,
    public readonly iterationsCompleted: number,
  ) {
    super(
      `Agent reasoning loop exceeded maximum of ${maxIterations} iterations ` +
        `(completed ${iterationsCompleted}). The goal could not be achieved.`,
    );
    this.name = 'MaxIterationsError';
  }
}

/**
 * Thrown when the LLM response cannot be parsed as a valid reasoning JSON.
 */
export class ReasoningParseError extends AgenticError {
  constructor(
    message: string,
    public readonly rawContent: string,
  ) {
    super(message);
    this.name = 'ReasoningParseError';
  }
}

/**
 * Thrown when a tool execution fails.
 */
export class ToolExecutionError extends AgenticError {
  constructor(
    public readonly toolName: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`Tool "${toolName}" failed: ${message}`);
    this.name = 'ToolExecutionError';
  }
}
