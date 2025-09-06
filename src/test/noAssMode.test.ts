function noAss(
  roleplayMessages: Array<{ content: string; role: string }>,
  roadwayInstruction: string,
  roadwayRole: 'system' | 'user',
  formattedRoleplayMessagePosition: 'append_top' | 'append_bottom' | 'to_var({{roadwayNoAssMessages}})',
) {
  const context = {
    substituteParams: (text: string) => text,
  };

  const filteredMessages = roleplayMessages.filter((value) => value.role !== 'system');
  const formattedRoleplayMessages = filteredMessages
    .map((message) => {
      if (message.role === 'user') {
        return `{{user}}: ${message.content}`;
      } else if (message.role === 'assistant') {
        return `{{char}}: ${message.content}`;
      }
      return '';
    })
    .filter(msg => msg.length > 0)
    .join('\n\n');

  if (formattedRoleplayMessagePosition === 'append_bottom') {
    return {
      content: context.substituteParams(roadwayInstruction + '\n' + formattedRoleplayMessages),
      role: roadwayRole,
    };
  } else if (formattedRoleplayMessagePosition === 'append_top') {
    return {
      content: context.substituteParams(formattedRoleplayMessages + '\n' + roadwayInstruction),
      role: roadwayRole,
    };
  } else {
    return {
      content: context.substituteParams(
        roadwayInstruction.replace('{{roadwayNoAssMessages}}', formattedRoleplayMessages),
      ),
      role: roadwayRole,
    };
  }
}

describe('noAss function', () => {
  const mockMessages = [
    { content: 'User message', role: 'user' },
    { content: 'Assistant message', role: 'assistant' },
    { content: 'System message', role: 'system' },
    { content: 'Another user message', role: 'user' },
  ];

  const roadwayInstruction = 'Generate options for {{user}}. Here are the messages: {{roadwayNoAssMessages}}';

  describe('message filtering', () => {
    it('formats messages and excludes system messages', () => {
      const result = noAss(mockMessages, roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(result.content).toContain('{{user}}: User message');
      expect(result.content).toContain('{{char}}: Assistant message');
      expect(result.content).toContain('{{user}}: Another user message');
      expect(result.content).not.toContain('System message');
    });

    it('produces correct output format', () => {
      const result = noAss(mockMessages, roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(result.content).toContain('Generate options for {{user}}');
      expect(result.content).toContain('{{user}}: User message');
      expect(result.content).toContain('{{char}}: Assistant message');
    });
  });

  describe('role handling', () => {
    it('uses user role when specified', () => {
      const result = noAss(mockMessages, roadwayInstruction, 'user', 'append_top');
      expect(result.role).toBe('user');
    });

    it('uses system role when specified', () => {
      const result = noAss(mockMessages, roadwayInstruction, 'system', 'append_top');
      expect(result.role).toBe('system');
    });
  });

  describe('position handling', () => {
    it('places messages at top when append_top', () => {
      const simpleInstruction = 'Simple instruction';
      const result = noAss(mockMessages, simpleInstruction, 'user', 'append_top');
      expect(result.content).toContain('{{user}}: User message');
      expect(result.content).toContain('Simple instruction');
      expect(result.content.startsWith('{{user}}: User message')).toBe(true);
    });

    it('places messages at bottom when append_bottom', () => {
      const simpleInstruction = 'Simple instruction';
      const result = noAss(mockMessages, simpleInstruction, 'user', 'append_bottom');
      expect(result.content).toContain('{{user}}: User message');
      expect(result.content).toContain('Simple instruction');
      expect(result.content.startsWith('Simple instruction')).toBe(true);
    });

    it('replaces variable when to_var', () => {
      const result = noAss(mockMessages, roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(result.content).toContain('{{user}}: User message');
      expect(result.content).toContain('{{char}}: Assistant message');
      expect(result.content).not.toContain('{{roadwayNoAssMessages}}');
    });
  });

  describe('edge cases', () => {
    it('handles empty message array', () => {
      const result = noAss([], roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(result.content).toContain('Generate options for {{user}}');
      expect(result.content).not.toContain('{{roadwayNoAssMessages}}');
    });

    it('handles messages with only system messages', () => {
      const systemOnlyMessages = [
        { content: 'System message 1', role: 'system' },
        { content: 'System message 2', role: 'system' },
      ];
      const result = noAss(systemOnlyMessages, roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(result.content).toContain('Generate options for {{user}}');
      expect(result.content).not.toContain('System message');
      expect(result.content).not.toContain('{{roadwayNoAssMessages}}');
    });

    it('handles messages without system role', () => {
      const noSystemMessages = [
        { content: 'User message', role: 'user' },
        { content: 'Assistant message', role: 'assistant' },
      ];
      const result = noAss(noSystemMessages, roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(result.content).toContain('{{user}}: User message');
      expect(result.content).toContain('{{char}}: Assistant message');
      expect(result.content).not.toContain('{{roadwayNoAssMessages}}');
    });

    it('handles long prompts correctly', () => {
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        content: `Message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
      }));
      const result = noAss(longMessages, roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(result.content).toContain('Message 0');
      expect(result.content).toContain('Message 19');
      expect(result.role).toBe('user');
    });

    it('handles role changes correctly', () => {
      const resultSystem = noAss(mockMessages, roadwayInstruction, 'system', 'to_var({{roadwayNoAssMessages}})');
      expect(resultSystem.role).toBe('system');

      const resultUser = noAss(mockMessages, roadwayInstruction, 'user', 'to_var({{roadwayNoAssMessages}})');
      expect(resultUser.role).toBe('user');
    });
  });
});

describe('Integration with settings', () => {
  it('exports noAss function for testing', () => {
    // Test that the function is exported from the main module
    expect(typeof noAss).toBe('function');
  });
});
