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
});
