import { z } from 'zod';

/**
 * DigitalOcean agent model ID type
 * Since agents are accessed by their endpoint URL, this represents the agent identifier
 */
export type DigitalOceanModelId = string;

/**
 * Settings for DigitalOcean language model
 */
export interface DigitalOceanLanguageModelSettings {
  /** Include retrieval information in responses */
  includeRetrievalInfo?: boolean;
  /** Include functions information in responses */
  includeFunctionsInfo?: boolean;
  /** Include guardrails information in responses */
  includeGuardrailsInfo?: boolean;
}

/**
 * Provider-specific options for DigitalOcean
 */
export const digitalOceanProviderOptions = z.object({
  /** Include retrieval information in response */
  includeRetrievalInfo: z.boolean().optional(),
  /** Include functions information in response */
  includeFunctionsInfo: z.boolean().optional(),
  /** Include guardrails information in response */
  includeGuardrailsInfo: z.boolean().optional(),
});

export type DigitalOceanProviderOptions = z.infer<typeof digitalOceanProviderOptions>;

/**
 * Configuration for DigitalOcean provider
 */
export interface DigitalOceanConfig {
  provider: string;
  url: (options: { path: string; modelId: string }) => string;
  headers: () => Record<string, string | undefined>;
  fetch?: typeof fetch;
}
