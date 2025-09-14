import { digitalocean, createDigitalOcean } from '../src';
import { LanguageModelV2 } from '@ai-sdk/provider';

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
      expect(model.specificationVersion).toBe('v2');
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
  });

  describe('Language Model', () => {
    it('implements LanguageModelV2 interface', () => {
      const model = digitalocean(mockAgentEndpoint);
      expect(model.specificationVersion).toBe('v2');
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
