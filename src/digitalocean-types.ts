/**
 * DigitalOcean AI Agent Endpoint Types
 * Based on https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-agents/
 */

/**
 * A message in the DigitalOcean agent chat completion request
 */
export interface DigitalOceanMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  name?: string;
  tool_calls?: DigitalOceanToolCall[];
  tool_call_id?: string;
}

/**
 * Function definition for DigitalOcean agent
 */
export interface DigitalOceanFunction {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool call in DigitalOcean format
 */
export interface DigitalOceanToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Request body for DigitalOcean agent chat completions endpoint
 */
export interface DigitalOceanChatCompletionRequest {
  /** Array of messages for the conversation */
  messages: DigitalOceanMessage[];
  /** Whether to stream the response */
  stream: boolean;
  /** Include retrieval information in response */
  include_retrieval_info?: boolean;
  /** Include functions information in response */
  include_functions_info?: boolean;
  /** Include guardrails information in response */
  include_guardrails_info?: boolean;
  /** Maximum number of tokens to generate */
  max_tokens?: number;
  /** Temperature for randomness (0-1) */
  temperature?: number;
  /** Top-p for nucleus sampling */
  top_p?: number;
  /** Frequency penalty */
  frequency_penalty?: number;
  /** Presence penalty */
  presence_penalty?: number;
  /** Stop sequences */
  stop?: string[];
  /** Functions available to the agent */
  functions?: DigitalOceanFunction[];
  /** Function call configuration */
  function_call?: 'auto' | 'none' | { name: string };
  /** Tools available to the agent (OpenAI-compatible format) */
  tools?: Array<{
    type: 'function';
    function: DigitalOceanFunction;
  }>;
  /** Tool choice configuration */
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * Choice in a DigitalOcean agent chat completion response
 */
export interface DigitalOceanChoice {
  index: number;
  message: {
    role: 'assistant';
    content?: string;
    tool_calls?: DigitalOceanToolCall[];
  };
  finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
}

/**
 * Usage information in DigitalOcean agent response
 */
export interface DigitalOceanUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Retrieval information from DigitalOcean agent knowledge base
 */
export interface DigitalOceanRetrieval {
  retrieved_data: Array<{
    id: string;
    index: string;
    page_content: string;
    score: number;
    filename: string;
    data_source_id: string;
    metadata: Record<string, unknown>;
  }>;
}

/**
 * Guardrails information from DigitalOcean agent
 */
export interface DigitalOceanGuardrails {
  triggered_guardrails: Array<{
    rule_name: string;
    message: string;
  }>;
}

/**
 * Functions information from DigitalOcean agent
 */
export interface DigitalOceanFunctions {
  called_functions: string[];
}

/**
 * Complete response from DigitalOcean agent chat completion
 */
export interface DigitalOceanChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: DigitalOceanChoice[];
  usage: DigitalOceanUsage;
  retrieval?: DigitalOceanRetrieval;
  guardrails?: DigitalOceanGuardrails;
  functions?: DigitalOceanFunctions;
}

/**
 * Streaming response chunk from DigitalOcean agent
 */
export interface DigitalOceanStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  }>;
  usage?: DigitalOceanUsage;
}

/**
 * Error response from DigitalOcean agent API
 */
export interface DigitalOceanErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}
