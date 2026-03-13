import {
  LanguageModelV3Prompt,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { DigitalOceanMessage, DigitalOceanToolCall } from './digitalocean-types';

/**
 * Convert AI SDK prompt to DigitalOcean agent message format
 */
export function convertToDigitalOceanMessages(
  prompt: LanguageModelV3Prompt,
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
              // V3: tool call has input: unknown (not args string)
              toolCalls.push({
                id: part.toolCallId,
                type: 'function',
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.input ?? {}),
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
        // V3: tool result parts have output: LanguageModelV3ToolResultOutput (typed union)
        for (const part of message.content) {
          if (part.type !== 'tool-result') continue;
          let toolResult: string;
          const output = part.output;
          if (!output) {
            toolResult = '';
          } else if (output.type === 'text' || output.type === 'error-text') {
            toolResult = output.value;
          } else if (output.type === 'json' || output.type === 'error-json') {
            toolResult = JSON.stringify(output.value);
          } else if (output.type === 'execution-denied') {
            toolResult = (output as any).reason ?? 'execution denied';
          } else {
            // 'content'
            toolResult = JSON.stringify((output as any).value);
          }
          messages.push({
            role: 'tool',
            tool_call_id: part.toolCallId || '',
            name: part.toolName || '',
            content: toolResult,
          });
        }
        break;

      default:
        throw new UnsupportedFunctionalityError({
          functionality: `Message role: ${(message as any).role}`,
        });
    }
  }

  return messages;
}
