import {
  LanguageModelV2,
  ProviderV2,
  NoSuchModelError,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { DigitalOceanLanguageModel } from './digitalocean-language-model';
import {
  DigitalOceanModelId,
  DigitalOceanLanguageModelSettings,
} from './digitalocean-settings';

/**
 * DigitalOcean provider interface extending ProviderV2
 */
export interface DigitalOceanProvider extends ProviderV2 {
  (
    agentEndpoint: string,
    settings?: DigitalOceanLanguageModelSettings,
  ): LanguageModelV2;

  /**
   * Creates a DigitalOcean language model from an agent endpoint.
   */
  languageModel(
    agentEndpoint: string,
    settings?: DigitalOceanLanguageModelSettings,
  ): LanguageModelV2;

  /**
   * Creates a DigitalOcean chat model from an agent endpoint.
   */
  chat(
    agentEndpoint: string,
    settings?: DigitalOceanLanguageModelSettings,
  ): LanguageModelV2;
}

/**
 * Provider settings for DigitalOcean
 */
export interface DigitalOceanProviderSettings {
  /**
   * DigitalOcean AI API key for authentication.
   * You can obtain this from the DigitalOcean control panel.
   */
  apiKey?: string;

  /**
   * Custom headers to include in requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;
}

/**
 * Create a DigitalOcean provider instance.
 */
export function createDigitalOcean(
  options: DigitalOceanProviderSettings = {},
): DigitalOceanProvider {
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'DIGITAL_OCEAN_AI_API_KEY',
      description: 'DigitalOcean AI API Key',
    })}`,
    ...options.headers,
  });

  const createLanguageModel = (
    agentEndpoint: string,
    settings: DigitalOceanLanguageModelSettings = {},
  ) => {
    if (new.target) {
      throw new Error(
        'The DigitalOcean model function cannot be called with the new keyword.',
      );
    }

    // Validate agent endpoint format (support both old and new domains)
    if (!agentEndpoint.includes('ondigitalocean.app') && !agentEndpoint.includes('agents.do-ai.run')) {
      throw new Error(
        `Invalid DigitalOcean agent endpoint: ${agentEndpoint}. ` +
        'Expected format: https://<agent-id>.ondigitalocean.app or https://<agent-id>.agents.do-ai.run',
      );
    }

    // Ensure the endpoint has the correct path for chat completions
    const baseUrl = agentEndpoint.endsWith('/api/v1/chat/completions')
      ? agentEndpoint.replace('/api/v1/chat/completions', '')
      : agentEndpoint.replace(/\/$/, '');

    return new DigitalOceanLanguageModel(
      agentEndpoint,
      settings,
      {
        provider: 'digitalocean',
        url: ({ path }) => `${baseUrl}${path}`,
        headers: getHeaders,
        fetch: options.fetch,
      },
    );
  };

  const provider = function (
    agentEndpoint: string,
    settings?: DigitalOceanLanguageModelSettings,
  ) {
    return createLanguageModel(agentEndpoint, settings);
  };

  provider.languageModel = createLanguageModel;
  provider.chat = createLanguageModel;

  // Unsupported model types for DigitalOcean
  provider.textEmbeddingModel = (modelId: string) => {
    throw new NoSuchModelError({
      modelId,
      modelType: 'textEmbeddingModel',
      message: 'Text embedding models are not supported by DigitalOcean AI provider',
    });
  };

  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({
      modelId,
      modelType: 'imageModel', 
      message: 'Image models are not supported by DigitalOcean AI provider',
    });
  };

  return provider as DigitalOceanProvider;
}

/**
 * Default DigitalOcean provider instance.
 */
export const digitalocean = createDigitalOcean();
