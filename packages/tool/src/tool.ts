import type { ToolDefinition, ToolResult } from '@agentic-eng/core';

/**
 * Interface that all tools must implement — both custom user tools
 * and MCP-sourced tools are normalized to this shape.
 *
 * @example
 * ```typescript
 * const calculator: Tool = {
 *   definition: {
 *     name: 'calculator',
 *     description: 'Performs basic arithmetic operations.',
 *     inputSchema: {
 *       type: 'object',
 *       properties: {
 *         expression: { type: 'string', description: 'Math expression to evaluate' },
 *       },
 *       required: ['expression'],
 *     },
 *   },
 *   async execute(input) {
 *     const result = eval(input.expression as string);
 *     return { toolName: 'calculator', success: true, output: String(result) };
 *   },
 * };
 * ```
 */
export interface Tool {
  /** The tool's metadata: name, description, and input schema. */
  definition: ToolDefinition;

  /**
   * Execute the tool with the given input.
   * Must return a ToolResult with success/failure and output.
   */
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}
