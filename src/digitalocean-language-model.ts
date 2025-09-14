import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
  LanguageModelV2CallWarning,
  APICallError,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createJsonResponseHandler,
  createJsonStreamResponseHandler,
  postJsonToApi,
  ParseResult,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import {
  DigitalOceanConfig,
  DigitalOceanLanguageModelSettings,
} from './digitalocean-settings';
import {
  DigitalOceanChatCompletionRequest,
  DigitalOceanChatCompletionResponse,
  DigitalOceanStreamChunk,
  DigitalOceanFunction,
} from './digitalocean-types';
import { convertToDigitalOceanMessages } from './message-converter';

// Simple response schemas
const digitalOceanResponseSchema = z.any();
const digitalOceanStreamSchema = z.any();

export class DigitalOceanLanguageModel implements LanguageModelV2 {
  public readonly specificationVersion = 'v2' as const;
  public readonly modelId: string;
  public readonly provider: string;
  
  private readonly config: DigitalOceanConfig;
  private readonly settings: DigitalOceanLanguageModelSettings;

  constructor(
    modelId: string, 
    settings: DigitalOceanLanguageModelSettings, 
    config: DigitalOceanConfig
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.provider = config.provider;
  }

  get supportedUrls(): Record<string, RegExp[]> {
    return {};
  }

  private mapFinishReason(finishReason: string | null): LanguageModelV2FinishReason {
    switch (finishReason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'content_filter': return 'content-filter';
      case 'tool_calls': return 'tool-calls';
      default: return 'unknown';
    }
  }

  private convertZodSchemaToJsonSchema(schema: any): any {
    // Basic Zod to JSON Schema conversion
    // For production, consider using a proper Zod to JSON Schema converter
    if (schema && schema._def) {
      const def = schema._def;
      
      if (def.typeName === 'ZodObject') {
        const properties: any = {};
        const required: string[] = [];
        
        for (const [key, value] of Object.entries(def.shape || {})) {
          const fieldSchema = value as any;
          properties[key] = this.convertZodSchemaToJsonSchema(fieldSchema);
          
          if (!fieldSchema._def.isOptional) {
            required.push(key);
          }
        }
        
        return {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
        };
      } else if (def.typeName === 'ZodString') {
        return { type: 'string', description: def.description };
      } else if (def.typeName === 'ZodNumber') {
        return { type: 'number', description: def.description };
      } else if (def.typeName === 'ZodBoolean') {
        return { type: 'boolean', description: def.description };
      } else if (def.typeName === 'ZodArray') {
        return {
          type: 'array',
          items: this.convertZodSchemaToJsonSchema(def.type),
          description: def.description,
        };
      }
    }
    
    // Fallback
    return { type: 'string' };
  }

  private getArgs(options: LanguageModelV2CallOptions): {
    args: DigitalOceanChatCompletionRequest;
    warnings: LanguageModelV2CallWarning[];
  } {
    const warnings: LanguageModelV2CallWarning[] = [];
    const messages = convertToDigitalOceanMessages(options.prompt ?? []);

    // Build request args with tool support
    const args: DigitalOceanChatCompletionRequest = {
      messages,
      stream: false,
      include_retrieval_info: this.settings.includeRetrievalInfo ?? false,
      include_functions_info: this.settings.includeFunctionsInfo ?? false,
      include_guardrails_info: this.settings.includeGuardrailsInfo ?? false
    };

    // Convert AI SDK tools to DigitalOcean format
    if (options.tools?.length) {
      const tools: Array<{
        type: 'function';
        function: DigitalOceanFunction;
      }> = [];
      
      for (const [toolName, tool] of Object.entries(options.tools)) {
        const toolSpec = tool as any;
        tools.push({
          type: 'function' as const,
          function: {
            name: toolName,
            description: toolSpec.description || '',
            parameters: toolSpec.inputSchema ? this.convertZodSchemaToJsonSchema(toolSpec.inputSchema) : {
              type: 'object',
              properties: {},
            },
          },
        });
      }
      args.tools = tools;
    }

    // Handle tool choice
    if (options.toolChoice !== undefined) {
      const toolChoice = options.toolChoice as any;
      if (toolChoice === 'auto') {
        args.tool_choice = 'auto';
      } else if (toolChoice === 'none') {
        args.tool_choice = 'none';
      } else if (toolChoice === 'required') {
        args.tool_choice = 'required';
      } else if (typeof toolChoice === 'object' && toolChoice.type === 'tool') {
        args.tool_choice = {
          type: 'function',
          function: { name: toolChoice.toolName },
        };
      }
    }

    // Add optional parameters
    if (options.maxOutputTokens !== undefined) {
      args.max_tokens = options.maxOutputTokens;
    }

    if (options.temperature !== undefined) {
      args.temperature = options.temperature;
    }

    if (options.topP !== undefined) {
      args.top_p = options.topP;
    }

    if (options.frequencyPenalty !== undefined) {
      args.frequency_penalty = options.frequencyPenalty;
    }

    if (options.presencePenalty !== undefined) {
      args.presence_penalty = options.presencePenalty;
    }

    if (options.stopSequences?.length) {
      args.stop = options.stopSequences;
    }

    return { args, warnings };
  }

  public async doGenerate(
    options: LanguageModelV2CallOptions
  ): Promise<{
    content: LanguageModelV2Content[];
    finishReason: LanguageModelV2FinishReason;
    usage: LanguageModelV2Usage;
    warnings: LanguageModelV2CallWarning[];
    request?: { body: string };
    response?: { body: DigitalOceanChatCompletionResponse };
  }> {
    const { args, warnings } = this.getArgs(options);

    let response: Response;
    try {
      response = await (this.config.fetch ?? fetch)(
        this.config.url({ path: '/api/v1/chat/completions', modelId: this.modelId }),
        {
          method: 'POST',
          headers: Object.fromEntries(
            Object.entries(combineHeaders(this.config.headers(), options.headers ?? {}))
              .filter(([, value]) => value !== undefined) as [string, string][]
          ),
          body: JSON.stringify(args),
          signal: options.abortSignal,
        }
      );
    } catch (error) {
      throw new APICallError({
        message: 'Failed to connect to DigitalOcean API',
        url: this.config.url({ path: '/api/v1/chat/completions', modelId: this.modelId }),
        requestBodyValues: args,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new APICallError({
        message: `DigitalOcean API error: ${response.status} ${response.statusText}`,
        url: this.config.url({ path: '/api/v1/chat/completions', modelId: this.modelId }),
        requestBodyValues: args,
        statusCode: response.status,
        responseBody: errorText,
      });
    }

    const responseData = await response.json();
    const firstChoice = responseData.choices?.[0];
    
    if (!firstChoice?.message) {
      throw new Error('No message in response from DigitalOcean API');
    }

    const content: LanguageModelV2Content[] = [];

    // Add text content if present
    if (firstChoice.message.content) {
      content.push({
        type: 'text',
        text: firstChoice.message.content,
      });
    }

    // Add tool calls if present
    if (firstChoice.message.tool_calls) {
      for (const toolCall of firstChoice.message.tool_calls) {
        content.push({
          type: 'tool-call',
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          input: toolCall.function.arguments,
        });
      }
    }

    // Ensure we have some content
    if (content.length === 0) {
      throw new Error('No content or tool calls in response from DigitalOcean API');
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const usage = responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content,
      finishReason: this.mapFinishReason(firstChoice.finish_reason || null),
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      warnings,
      request: { body: JSON.stringify(args) },
      response: {
        body: {
          id: 'do-' + timestamp,
          object: 'chat.completion',
          created: timestamp,
          model: this.modelId,
          choices: responseData.choices?.map((choice: any, index: number) => ({
            index,
            message: {
              role: 'assistant' as const,
              content: choice.message.content,
              tool_calls: choice.message.tool_calls,
            },
            finish_reason: choice.finish_reason,
          })) || [],
          usage: {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          },
        },
      },
    };
  }

  public async doStream(
    options: LanguageModelV2CallOptions
  ): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    warnings?: LanguageModelV2CallWarning[];
  }> {
    const { args, warnings } = this.getArgs(options);

    const streamingArgs: DigitalOceanChatCompletionRequest = {
      ...args,
      stream: true,
    };

    let response: Response;
    try {
      response = await (this.config.fetch ?? fetch)(
        this.config.url({ path: '/api/v1/chat/completions', modelId: this.modelId }),
        {
          method: 'POST',
          headers: Object.fromEntries(
            Object.entries(combineHeaders(this.config.headers(), options.headers ?? {}))
              .filter(([, value]) => value !== undefined) as [string, string][]
          ),
          body: JSON.stringify(streamingArgs),
          signal: options.abortSignal,
        }
      );
    } catch (error) {
      throw new APICallError({
        message: 'Failed to connect to DigitalOcean API',
        url: this.config.url({ path: '/api/v1/chat/completions', modelId: this.modelId }),
        requestBodyValues: streamingArgs,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new APICallError({
        message: `DigitalOcean API error: ${response.status} ${response.statusText}`,
        url: this.config.url({ path: '/api/v1/chat/completions', modelId: this.modelId }),
        requestBodyValues: streamingArgs,
        statusCode: response.status,
        responseBody: errorText,
      });
    }

    let finishReason: LanguageModelV2FinishReason = 'unknown';
    let usage: LanguageModelV2Usage = {
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
    };

    const decoder = new TextDecoder();
    const transformStream = new TransformStream<Uint8Array, LanguageModelV2StreamPart>({
      start: (controller) => {
        if (warnings.length > 0) {
          controller.enqueue({ type: 'stream-start', warnings });
        }
      },

      transform: (chunk, controller) => {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            const jsonString = trimmedLine.slice(6);
            try {
              const jsonData = JSON.parse(jsonString);
              const choice = jsonData.choices?.[0];
              
              if (!choice) continue;

              // Handle text content
              if (choice.delta?.content) {
                controller.enqueue({
                  type: 'text-delta',
                  id: '0',
                  delta: choice.delta.content,
                });
              }

              // Handle tool calls
              if (choice.delta?.tool_calls) {
                for (const toolCall of choice.delta.tool_calls) {
                  if (toolCall.function?.name) {
                    // Tool call start
                    controller.enqueue({
                      type: 'tool-input-start',
                      id: toolCall.id || `tool-${Date.now()}`,
                      toolName: toolCall.function.name,
                    });
                  }
                  
                  if (toolCall.function?.arguments) {
                    // Tool call arguments delta
                    controller.enqueue({
                      type: 'tool-input-delta',
                      id: toolCall.id || `tool-${Date.now()}`,
                      delta: toolCall.function.arguments,
                    });
                  }
                }
              }

              // Handle finish reason and usage
              if (choice.finish_reason) {
                finishReason = this.mapFinishReason(choice.finish_reason);
                
                if (jsonData.usage) {
                  usage = {
                    inputTokens: jsonData.usage.prompt_tokens,
                    outputTokens: jsonData.usage.completion_tokens,
                    totalTokens: jsonData.usage.total_tokens,
                  };
                }
              }
            } catch (parseError) {
              // Skip malformed JSON chunks - they're often incomplete streaming data
              // In production, you may want to log this for debugging
              const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
              console.warn('Failed to parse streaming chunk:', errorMessage);
              continue;
            }
          }
        }
      },

      flush: (controller) => {
        controller.enqueue({
          type: 'finish',
          finishReason,
          usage,
        });
      },
    });

    return {
      stream: response.body.pipeThrough(transformStream),
      warnings,
    };
  }
}
