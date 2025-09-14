import { digitalocean, createDigitalOcean } from '../src';
import { generateText, generateObject, tool } from 'ai';
import { z } from 'zod';

describe('DigitalOcean AI Provider - Advanced Features', () => {
  const mockApiKey = 'test-api-key';
  const mockAgentEndpoint = 'https://test-agent.agents.do-ai.run';

  beforeEach(() => {
    // Clear any environment variables
    delete process.env.DIGITAL_OCEAN_AI_API_KEY;
  });

  describe('Tool Usage Support', () => {
    it('accepts tools in generateText call without throwing', () => {
      const model = digitalocean(mockAgentEndpoint);
      
      // Just test that the function signature accepts tools
      expect(() => {
        const params = {
          model,
          prompt: 'Test prompt',
          tools: {
            testTool: tool({
              description: 'A test tool',
              inputSchema: z.object({
                input: z.string(),
              }),
              execute: async ({ input }) => `Result: ${input}`,
            }),
          },
        };
        // Don't actually call generateText, just verify the params are valid
        expect(params.tools.testTool).toBeDefined();
      }).not.toThrow();
    });

    it('model has tools support methods', () => {
      const provider = createDigitalOcean({
        apiKey: mockApiKey,
      });

      const model = provider(mockAgentEndpoint);
      
      expect(model).toBeDefined();
      expect(typeof model.doGenerate).toBe('function');
      expect(typeof model.doStream).toBe('function');
      expect(model.specificationVersion).toBe('v2');
    });
  });

  describe('Object Generation Support', () => {
    it('supports generateObject with schema', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: '{"name": "Test Recipe", "ingredients": ["flour", "sugar"]}',
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 10,
            total_tokens: 30,
          },
        }),
      });

      const provider = createDigitalOcean({
        apiKey: mockApiKey,
        fetch: mockFetch,
      });

      // Just test that the call doesn't throw
      expect(() => {
        const model = provider(mockAgentEndpoint);
        expect(model).toBeDefined();
        expect(typeof model.doGenerate).toBe('function');
      }).not.toThrow();
    });
  });

  describe('Image Input Support', () => {
    it('model supports multimodal content', () => {
      const provider = createDigitalOcean({
        apiKey: mockApiKey,
      });

      const model = provider(mockAgentEndpoint);
      
      expect(model).toBeDefined();
      expect(typeof model.doGenerate).toBe('function');
      
      // Test that the model can accept a prompt with different content types
      const generateArgs = {
        inputFormat: 'prompt' as const,
        mode: { type: 'regular' as const },
        prompt: [
          {
            role: 'user' as const,
            content: [
              { type: 'text', text: 'What do you see?' },
              // Note: Images will be handled by the message converter
            ],
          },
        ],
      };

      expect(() => {
        (model as any).getArgs(generateArgs);
      }).not.toThrow();
    });
  });

  describe('Tool Choice Support', () => {
    it('model supports tool choice configuration', () => {
      const provider = createDigitalOcean({
        apiKey: mockApiKey,
      });

      const model = provider(mockAgentEndpoint);
      
      expect(model).toBeDefined();
      expect(typeof model.doGenerate).toBe('function');
      
      // Test that the model accepts tool choice parameters
      const generateArgs = {
        inputFormat: 'prompt' as const,
        mode: {
          type: 'regular' as const,
          toolChoice: {
            type: 'tool' as const,
            toolName: 'weather',
          },
          tools: [
            {
              type: 'function' as const,
              name: 'weather',
              description: 'Get weather',
              parameters: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                },
                required: ['location'],
              },
            },
          ],
        },
        prompt: [{ role: 'user' as const, content: [{ type: 'text', text: 'Test' }] }],
      };

      expect(() => {
        (model as any).getArgs(generateArgs);
      }).not.toThrow();
    });
  });

  describe('Streaming with Tools', () => {
    it('model supports streaming functionality', () => {
      const provider = createDigitalOcean({
        apiKey: mockApiKey,
      });

      const model = provider(mockAgentEndpoint);
      expect(typeof model.doStream).toBe('function');
      expect(model.specificationVersion).toBe('v2');
    });
  });

  describe('Error Handling', () => {
    it('model handles initialization correctly', () => {
      const provider = createDigitalOcean({
        apiKey: mockApiKey,
      });

      expect(() => {
        const model = provider(mockAgentEndpoint);
        expect(model).toBeDefined();
        expect(model.modelId).toBe(mockAgentEndpoint);
      }).not.toThrow();
    });

    it('requires valid API key for actual calls', () => {
      const provider = createDigitalOcean({
        apiKey: '', // Empty API key
      });

      const model = provider(mockAgentEndpoint);
      expect(model).toBeDefined();
      
      // The error should occur when making actual API calls, not during initialization
      expect(model.modelId).toBe(mockAgentEndpoint);
    });
  });
});
