import { convertToDigitalOceanMessages } from '../src/message-converter';
import { LanguageModelV2Prompt } from '@ai-sdk/provider';

describe('Message Converter', () => {
  describe('Basic Message Conversion', () => {
    it('converts simple text messages', () => {
      const prompt: LanguageModelV2Prompt = [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      
      expect(converted).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
    });

    it('converts system messages', () => {
      const prompt: LanguageModelV2Prompt = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      
      expect(converted).toEqual([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty messages array', () => {
      const prompt: LanguageModelV2Prompt = [];
      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted).toEqual([]);
    });

    it('handles messages with empty content arrays', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'user',
          content: [],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      
      expect(converted[0]).toEqual({
        role: 'user',
        content: '',
      });
    });

    it('handles multiple text parts in one message', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'First part' },
            { type: 'text', text: 'Second part' },
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      
      expect(converted[0].content).toBe('First part\n\nSecond part');
    });

    it('handles unsupported content types gracefully', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Supported text' },
            { type: 'file', file: { name: 'test.txt', content: 'content' } } as any,
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      
      // Should only include the text part, skipping unsupported file part
      expect(converted[0].content).toBe('Supported text');
    });
  });

  describe('Image Handling', () => {
    it('handles image part with URL', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see?' },
            { type: 'image', image: new URL('https://example.com/image.png') } as any,
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted[0].content).toContain('[Image:');
      expect(converted[0].content).toContain('https://example.com/image.png');
    });

    it('handles image part with string base64', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'user',
          content: [
            { type: 'image', image: 'base64encodeddata' } as any,
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted[0].content).toContain('[Image: base64 data provided]');
    });

    it('handles image part with binary data', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'user',
          content: [
            { type: 'image', image: new Uint8Array([1, 2, 3]) } as any,
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted[0].content).toContain('[Image: binary data provided]');
    });

    it('skips unknown content types without image property', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'test' },
            { type: 'unknown_type' } as any,
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted[0].content).toBe('test');
    });
  });

  describe('Assistant Messages with Tool Calls', () => {
    it('converts assistant message with tool calls', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me check the weather.' },
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'get_weather',
              input: '{"city":"Paris"}',
            } as any,
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted).toHaveLength(1);
      expect(converted[0].role).toBe('assistant');
      expect(converted[0].content).toBe('Let me check the weather.');
      expect(converted[0].tool_calls).toHaveLength(1);
      expect(converted[0].tool_calls?.[0].function.name).toBe('get_weather');
    });

    it('skips assistant message with no content and no tool calls', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'assistant',
          content: [],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted).toHaveLength(0);
    });

    it('skips unsupported assistant content types', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'text' },
            { type: 'reasoning', text: 'thinking...' } as any,
          ],
        },
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted).toHaveLength(1);
      expect(converted[0].content).toBe('text');
    });
  });

  describe('Tool Messages', () => {
    it('converts tool result messages', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_1',
              toolName: 'get_weather',
              result: { temperature: '20C', city: 'Paris' },
            } as any,
          ],
        } as any,
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted).toHaveLength(1);
      expect(converted[0].role).toBe('tool');
      expect(converted[0].content).toContain('Paris');
    });

    it('handles tool message with no content array', () => {
      const prompt: LanguageModelV2Prompt = [
        {
          role: 'tool',
          content: null as any,
        } as any,
      ];

      const converted = convertToDigitalOceanMessages(prompt);
      expect(converted).toHaveLength(1);
      expect(converted[0].role).toBe('tool');
      expect(converted[0].content).toBe('');
    });
  });

  describe('Error Cases', () => {
    it('throws UnsupportedFunctionalityError for unknown roles', () => {
      const prompt = [
        { role: 'unknown_role', content: [] },
      ] as any;

      expect(() => convertToDigitalOceanMessages(prompt)).toThrow();
    });
  });
});
