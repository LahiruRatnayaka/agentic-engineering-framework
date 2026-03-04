import { describe, it, expect } from 'vitest';

import { Agent } from './agent';

describe('Agent', () => {
  it('should create an agent with a name', () => {
    const agent = new Agent({ name: 'test-agent' });
    expect(agent.name).toBe('test-agent');
  });

  it('should create an agent with a name and description', () => {
    const agent = new Agent({ name: 'test-agent', description: 'A test agent' });
    expect(agent.name).toBe('test-agent');
    expect(agent.description).toBe('A test agent');
  });

  it('should throw if name is empty', () => {
    expect(() => new Agent({ name: '' })).toThrow('Agent name is required and cannot be empty.');
  });

  it('should throw if name is whitespace only', () => {
    expect(() => new Agent({ name: '   ' })).toThrow(
      'Agent name is required and cannot be empty.',
    );
  });
});
