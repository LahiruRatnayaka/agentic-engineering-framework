/**
 * Base error class for all EASA framework errors.
 */
export class EasaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EasaError';
  }
}

/**
 * Thrown when an LLM provider encounters an error.
 */
export class ProviderError extends EasaError {
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
export class AgentConfigError extends EasaError {
  constructor(message: string) {
    super(message);
    this.name = 'AgentConfigError';
  }
}

/**
 * Thrown when the agent's reasoning loop exceeds the maximum allowed iterations.
 */
export class MaxIterationsError extends EasaError {
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
export class ReasoningParseError extends EasaError {
  constructor(
    message: string,
    public readonly rawContent: string,
  ) {
    super(message);
    this.name = 'ReasoningParseError';
  }
}
