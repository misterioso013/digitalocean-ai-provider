import { digitalocean, createDigitalOcean } from '../src';
import { LanguageModelV3 } from '@ai-sdk/provider';
import { NoSuchModelError } from '@ai-sdk/provider';

describe('DigitalOcean AI Provider', () => {
  const mockApiKey = 'test-api-key';
  const mockAgentEndpoint = 'https://test-agent.agents.do-ai.run';

  beforeEach(() => {
    // Clear any environment variables
    delete process.env.DIGITAL_OCEAN_AI_API_KEY;
  });

  describe('Provider Factory', () => {
    it('creates a default provider instance', () => {
      const model = digitalocean(mockAgentEndpoint);
      expect(model).toBeDefined();
      expect(model.modelId).toBe(mockAgentEndpoint);
      expect(model.specificationVersion).toBe('v3');
    });

    it('creates a custom provider instance', () => {
      const provider = createDigitalOcean({ apiKey: mockApiKey });
      const model = provider(mockAgentEndpoint);
      expect(model).toBeDefined();
      expect(model.modelId).toBe(mockAgentEndpoint);
    });

    it('accepts both domain formats', () => {
      const oldDomain = 'https://test-agent.ondigitalocean.app';
      const newDomain = 'https://test-agent.agents.do-ai.run';
      
      expect(() => digitalocean(oldDomain)).not.toThrow();
      expect(() => digitalocean(newDomain)).not.toThrow();
    });

    it('validates the agent endpoint', () => {
      const invalidEndpoint = 'https://invalid-endpoint.example.com';
      expect(() => digitalocean(invalidEndpoint)).toThrow(/Invalid DigitalOcean agent endpoint/);
    });

    it('throws NoSuchModelError for textEmbeddingModel', () => {
      const provider = createDigitalOcean({ apiKey: mockApiKey });
      expect(() => provider.textEmbeddingModel!('text-embedding-3-small')).toThrow(NoSuchModelError);
    });

    it('throws NoSuchModelError for imageModel', () => {
      const provider = createDigitalOcean({ apiKey: mockApiKey });
      expect(() => provider.imageModel('dall-e-3')).toThrow(NoSuchModelError);
    });

    it('creates model via languageModel method', () => {
      const provider = createDigitalOcean({ apiKey: mockApiKey });
      const model = provider.languageModel(mockAgentEndpoint);
      expect(model).toBeDefined();
      expect(model.modelId).toBe(mockAgentEndpoint);
    });

    it('creates model via chat method', () => {
      const provider = createDigitalOcean({ apiKey: mockApiKey });
      const model = provider.chat(mockAgentEndpoint);
      expect(model).toBeDefined();
      expect(model.modelId).toBe(mockAgentEndpoint);
    });

    it('strips trailing /api/v1/chat/completions from endpoint', async () => {
      const endpointWithPath = `${mockAgentEndpoint}/api/v1/chat/completions`;
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hi', role: 'assistant' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
          }),
        body: null,
      });

      const provider = createDigitalOcean({ apiKey: mockApiKey, fetch: mockFetch });
      const model = provider(endpointWithPath);

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
      });

      // The URL called should be the base URL + /api/v1/chat/completions (not doubled)
      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe(`${mockAgentEndpoint}/api/v1/chat/completions`);
    });

    it('accepts custom headers', () => {
      const provider = createDigitalOcean({
        apiKey: mockApiKey,
        headers: { 'X-Custom-Header': 'custom-value' },
      });
      const model = provider(mockAgentEndpoint);
      expect(model).toBeDefined();
    });
  });

  describe('Language Model', () => {
    it('implements LanguageModelV3 interface', () => {
      const model = digitalocean(mockAgentEndpoint);
      expect(model.specificationVersion).toBe('v3');
      expect(typeof model.doGenerate).toBe('function');
      expect(typeof model.doStream).toBe('function');
    });

    it('accepts custom settings', () => {
      const model = digitalocean(mockAgentEndpoint, {
        includeRetrievalInfo: true,
        includeFunctionsInfo: true,
        includeGuardrailsInfo: true,
      });
      expect(model).toBeDefined();
    });
  });

  describe('Environment Variables', () => {
    it('uses API key from environment', () => {
      process.env.DIGITAL_OCEAN_AI_API_KEY = mockApiKey;
      const model = digitalocean(mockAgentEndpoint);
      expect(model).toBeDefined();
    });

    it('prioritizes explicit API key over environment', () => {
      process.env.DIGITAL_OCEAN_AI_API_KEY = 'env-key';
      const provider = createDigitalOcean({ apiKey: mockApiKey });
      const model = provider(mockAgentEndpoint);
      expect(model).toBeDefined();
    });
  });
});
