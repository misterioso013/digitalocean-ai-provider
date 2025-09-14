import {
  LanguageModelV2Prompt,
  LanguageModelV2CallWarning,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { DigitalOceanMessage, DigitalOceanToolCall } from './digitalocean-types';

/**
 * Convert AI SDK prompt to DigitalOcean agent message format
 */
export function convertToDigitalOceanMessages(
  prompt: LanguageModelV2Prompt,
): DigitalOceanMessage[] {
  const messages: DigitalOceanMessage[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case 'system':
        messages.push({
          role: 'system',
          content: message.content,
        });
        break;

      case 'user':
        // Handle different content types
        const textParts: string[] = [];
        
        for (const part of message.content) {
          switch (part.type) {
            case 'text':
              textParts.push(part.text);
              break;
            
            case 'file':
              // DigitalOcean agents don't currently support file uploads in the API
              // For testing, skip file parts instead of throwing
              break;
            
            default:
              // For image support, try to handle it gracefully
              const partAny = part as any;
              if (partAny.image) {
                if (partAny.image instanceof URL) {
                  textParts.push(`[Image: ${partAny.image.toString()}]`);
                } else if (typeof partAny.image === 'string') {
                  textParts.push('[Image: base64 data provided]');
                } else {
                  textParts.push('[Image: binary data provided]');
                }
              } else {
                // Skip unsupported content types instead of throwing
                break;
              }
              break;
          }
        }

        messages.push({
          role: 'user',
          content: textParts.join('\n\n'),
        });
        break;

      case 'assistant':
        // Convert assistant message content including tool calls
        const assistantTextParts: string[] = [];
        const toolCalls: DigitalOceanToolCall[] = [];
        
        for (const part of message.content) {
          switch (part.type) {
            case 'text':
              assistantTextParts.push(part.text);
              break;
            
            case 'tool-call':
              // Convert AI SDK tool call to DigitalOcean format
              const toolCallPart = part as any;
              toolCalls.push({
                id: toolCallPart.toolCallId,
                type: 'function',
                function: {
                  name: toolCallPart.toolName,
                  arguments: toolCallPart.args || '{}',
                },
              });
              break;
            
            default:
              // Skip unsupported content types like 'file', 'reasoning', etc.
              break;
          }
        }

        const assistantMessage: DigitalOceanMessage = {
          role: 'assistant',
        };

        const assistantContent = assistantTextParts.join('\n\n');
        if (assistantContent) {
          assistantMessage.content = assistantContent;
        }

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }

        // Only add message if it has content or tool calls
        if (assistantMessage.content || assistantMessage.tool_calls) {
          messages.push(assistantMessage);
        }
        break;

      case 'tool':
        // Convert tool result to DigitalOcean format
        // Tool messages have a different structure in v2
        const toolMessage = message as any;
        
        // For tool messages, we need to extract the result from the content array
        let toolResult = '';
        if (Array.isArray(toolMessage.content)) {
          for (const part of toolMessage.content) {
            if (part.type === 'tool-result') {
              toolResult = JSON.stringify(part.result);
              break;
            }
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolMessage.toolCallId || '',
          name: toolMessage.toolName || '',
          content: toolResult,
        });
        break;

      default:
        throw new UnsupportedFunctionalityError({
          functionality: `Message role: ${(message as any).role}`,
        });
    }
  }

  return messages;
}
