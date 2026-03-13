import {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
  SharedV3Warning,
  APICallError,
} from '@ai-sdk/provider';
import { combineHeaders } from '@ai-sdk/provider-utils';
import {
  DigitalOceanConfig,
  DigitalOceanLanguageModelSettings,
} from './digitalocean-settings';
import {
  DigitalOceanChatCompletionRequest,
  DigitalOceanChatCompletionResponse,
  DigitalOceanFunction,
} from './digitalocean-types';
import { convertToDigitalOceanMessages } from './message-converter';

export class DigitalOceanLanguageModel implements LanguageModelV3 {
  public readonly specificationVersion = 'v3' as const;
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

  private mapFinishReason(finishReason: string | null): LanguageModelV3FinishReason {
    const raw = finishReason ?? undefined;
    switch (finishReason) {
      case 'stop': return { unified: 'stop', raw };
      case 'length': return { unified: 'length', raw };
      case 'content_filter': return { unified: 'content-filter', raw };
      case 'tool_calls': return { unified: 'tool-calls', raw };
      default: return { unified: 'other', raw };
    }
  }

  private getArgs(options: LanguageModelV3CallOptions): {
    args: DigitalOceanChatCompletionRequest;
    warnings: SharedV3Warning[];
  } {
    const warnings: SharedV3Warning[] = [];
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
      
      for (const tool of options.tools) {
        if (tool.type === 'function') {
          tools.push({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description || '',
              parameters: (tool.inputSchema as DigitalOceanFunction['parameters']) ?? {
                type: 'object',
                properties: {},
              },
            },
          });
        }
      }
      if (tools.length > 0) {
        args.tools = tools;
      }
    }

    // Handle tool choice
    if (options.toolChoice !== undefined) {
      const toolChoice = options.toolChoice;
      if (toolChoice.type === 'auto') {
        args.tool_choice = 'auto';
      } else if (toolChoice.type === 'none') {
        args.tool_choice = 'none';
      } else if (toolChoice.type === 'required') {
        args.tool_choice = 'required';
      } else if (toolChoice.type === 'tool') {
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
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3GenerateResult> {
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

    const content: LanguageModelV3Content[] = [];

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
    
    const usage = responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content,
      finishReason: this.mapFinishReason(firstChoice.finish_reason || null),
      usage: {
        inputTokens: {
          total: usage.prompt_tokens,
          noCache: undefined,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: usage.completion_tokens,
          text: undefined,
          reasoning: undefined,
        },
      },
      warnings,
      request: { body: args },
      response: {
        id: responseData.id,
        modelId: responseData.model ?? this.modelId,
        timestamp: new Date(),
      },
    };
  }

  public async doStream(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3StreamResult> {
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

    let finishReason: LanguageModelV3FinishReason = { unified: 'other', raw: undefined };
    let usage: LanguageModelV3Usage = {
      inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: undefined, text: undefined, reasoning: undefined },
    };

    // State for text block lifecycle
    let inTextBlock = false;
    const textBlockId = 'text-0';
    // Track started tool IDs for tool-input-end
    const startedToolIds = new Set<string>();

    const decoder = new TextDecoder();
    const transformStream = new TransformStream<Uint8Array, LanguageModelV3StreamPart>({
      start: (controller) => {
        controller.enqueue({ type: 'stream-start', warnings });
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
                if (!inTextBlock) {
                  inTextBlock = true;
                  controller.enqueue({ type: 'text-start', id: textBlockId });
                }
                controller.enqueue({
                  type: 'text-delta',
                  id: textBlockId,
                  delta: choice.delta.content,
                });
              }

              // Handle tool calls
              if (choice.delta?.tool_calls) {
                // Close any open text block before tool calls
                if (inTextBlock) {
                  inTextBlock = false;
                  controller.enqueue({ type: 'text-end', id: textBlockId });
                }
                for (const toolCall of choice.delta.tool_calls) {
                  const toolId = toolCall.id || `tool-${Date.now()}`;
                  if (toolCall.function?.name) {
                    startedToolIds.add(toolId);
                    controller.enqueue({
                      type: 'tool-input-start',
                      id: toolId,
                      toolName: toolCall.function.name,
                    });
                  }
                  if (toolCall.function?.arguments) {
                    controller.enqueue({
                      type: 'tool-input-delta',
                      id: toolId,
                      delta: toolCall.function.arguments,
                    });
                  }
                }
              }

              // Emit response-metadata from first chunk that has an id
              if (jsonData.id && !jsonData._metadataEmitted) {
                jsonData._metadataEmitted = true;
                controller.enqueue({
                  type: 'response-metadata',
                  id: jsonData.id,
                  modelId: jsonData.model ?? this.modelId,
                  timestamp: new Date(jsonData.created * 1000),
                });
              }

              // Handle finish reason and usage
              if (choice.finish_reason) {
                finishReason = this.mapFinishReason(choice.finish_reason);

                if (jsonData.usage) {
                  usage = {
                    inputTokens: {
                      total: jsonData.usage.prompt_tokens,
                      noCache: undefined,
                      cacheRead: undefined,
                      cacheWrite: undefined,
                    },
                    outputTokens: {
                      total: jsonData.usage.completion_tokens,
                      text: undefined,
                      reasoning: undefined,
                    },
                  };
                }
              }
            } catch (parseError) {
              const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
              console.warn('Failed to parse streaming chunk:', errorMessage);
              continue;
            }
          }
        }
      },

      flush: (controller) => {
        // Close any open text block
        if (inTextBlock) {
          controller.enqueue({ type: 'text-end', id: textBlockId });
        }
        // Close any open tool input blocks
        for (const toolId of startedToolIds) {
          controller.enqueue({ type: 'tool-input-end', id: toolId });
        }
        controller.enqueue({
          type: 'finish',
          finishReason,
          usage,
        });
      },
    });

    return {
      stream: response.body.pipeThrough(transformStream),
      request: { body: streamingArgs },
    };
  }
}
