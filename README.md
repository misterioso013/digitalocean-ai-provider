# DigitalOcean AI Provider

> Not official DigitalOcean product.

A provider for the [Vercel AI SDK](https://ai-sdk.dev) that enables integration with DigitalOcean's Gradient AI Platform agents.

[![npm version](https://badge.fury.io/js/digitalocean-ai-provider.svg)](https://badge.fury.io/js/digitalocean-ai-provider)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-yellow.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

- 🚀 **AI SDK v5+ Compatible** - Implements the latest LanguageModelV2 specification
- 🌊 **Streaming Support** - Real-time streaming of AI responses and tool calls
- 🔧 **Tool Integration** - Function calling with streaming tool execution
- 📦 **Object Generation** - Structured data generation with JSON schemas
- 🖼️ **Multimodal Input** - Support for text and image content
- 🔗 **Agent Integration** - Direct integration with DigitalOcean AI agents
- 📊 **Rich Metadata** - Access to retrieval, functions, and guardrails information
- 🛡️ **Error Handling** - Comprehensive error handling with proper error types
- 💪 **TypeScript First** - Full TypeScript support with complete type definitions

## Installation

```bash
npm install digitalocean-ai-provider ai
```

```bash
yarn add digitalocean-ai-provider ai
```

```bash
pnpm add digitalocean-ai-provider ai
```

## Quick Start
> Read about DigitalOcean's Gradient AI Platform and agents [here](https://docs.digitalocean.com/products/gradient-ai-platform/how-to/).

### 1. Set up your API key

You can get your DigitalOcean AI API key from the [DigitalOcean Control Panel](https://cloud.digitalocean.com/gen-ai).

```bash
export DIGITAL_OCEAN_AI_API_KEY="your-api-key-here"
```

### 2. Create and use an agent

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  prompt: 'What is the capital of France?',
});

console.log(text);
```

## Configuration

### Using a custom provider instance

```typescript
import { createDigitalOcean } from 'digitalocean-ai-provider';

const customDigitalOcean = createDigitalOcean({
  apiKey: 'your-api-key', // Optional: defaults to DIGITAL_OCEAN_AI_API_KEY env var
  headers: {
    'X-Custom-Header': 'value',
  },
});

const model = customDigitalOcean('https://your-agent-id.ondigitalocean.app');
```

### Model settings

You can configure DigitalOcean-specific features:

```typescript
const model = digitalocean('https://your-agent-id.ondigitalocean.app', {
  includeRetrievalInfo: true,    // Include knowledge base retrieval information
  includeFunctionsInfo: true,    // Include function calling information
  includeGuardrailsInfo: true,   // Include guardrails information
});
```

## Usage Examples

### Text Generation

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  prompt: 'Explain quantum computing',
  maxTokens: 500,
  temperature: 0.7,
});
```

### Tool Usage (Function Calling)

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { text, toolCalls } = await generateText({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  prompt: 'What is the weather like in San Francisco?',
  tools: {
    getWeather: tool({
      description: 'Get the current weather in a city',
      inputSchema: z.object({
        city: z.string().describe('The city to get weather for'),
      }),
      execute: async ({ city }) => {
        // Your weather API logic here
        return `Weather in ${city}: 72°F and sunny`;
      },
    }),
  },
});

console.log('Response:', text);
console.log('Tool calls:', toolCalls);
```

### Object Generation

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      instructions: z.array(z.string()),
      cookingTime: z.number().describe('Cooking time in minutes'),
    }),
  }),
  prompt: 'Generate a recipe for chocolate chip cookies',
});

console.log('Generated recipe:', object.recipe);
```

### Multimodal Input (Images)

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see in this image?' },
        { 
          type: 'image', 
          image: 'https://example.com/photo.jpg' 
        },
      ],
    },
  ],
});

console.log('Image analysis:', text);
```

### Streaming

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { streamText } from 'ai';

const { textStream } = await streamText({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  prompt: 'Write a story about AI',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

### Streaming with Tools

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { streamText, tool } from 'ai';
import { z } from 'zod';

const { textStream, toolCalls } = await streamText({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  prompt: 'Search for information about TypeScript',
  tools: {
    search: tool({
      description: 'Search for information',
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        return `Search results for: ${query}`;
      },
    }),
  },
});

// Stream text content
for await (const chunk of textStream) {
  process.stdout.write(chunk);
}

// Handle tool calls
for await (const toolCall of toolCalls) {
  console.log('Tool call:', toolCall);
}
```

### Chat Conversation

```typescript
import { digitalocean } from 'digitalocean-ai-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: digitalocean('https://your-agent-id.ondigitalocean.app'),
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi! How can I help you today?' },
    { role: 'user', content: 'What can you do?' },
  ],
});
```

## Agent Endpoint Format

DigitalOcean AI agents are accessed through their unique endpoints. The format is:

```
https://<agent-identifier>.ondigitalocean.app
# or the new format:
https://<agent-identifier>.agents.do-ai.run
```

You can find your agent's endpoint in the DigitalOcean Control Panel under:
1. **Agent Platform** → **Agent Workspaces** 
2. Select your workspace
3. Click on your agent
4. Find the endpoint URL in the **Overview** tab

## Advanced Examples

For comprehensive examples demonstrating all AI SDK features, see the [examples/advanced-features.ts](examples/advanced-features.ts) file which includes:

- Complex tool usage with multiple functions
- Object generation with nested schemas
- Streaming responses with tool calls
- Multimodal input handling
- Error handling patterns
- Advanced configuration options

```typescript
// See examples/advanced-features.ts for detailed implementations
import { runAdvancedToolExample, runObjectGenerationExample } from './examples/advanced-features';

// Run advanced tool usage example
await runAdvancedToolExample();

// Run object generation example  
await runObjectGenerationExample();
```

## API Reference

### `createDigitalOcean(options?)`

Creates a new DigitalOcean provider instance.

**Parameters:**
- `options.apiKey?: string` - API key (defaults to `DIGITAL_OCEAN_AI_API_KEY` env var)
- `options.headers?: Record<string, string>` - Custom headers
- `options.fetch?: FetchFunction` - Custom fetch implementation

### `digitalocean(agentEndpoint, settings?)`

Creates a language model using the default provider instance.

**Parameters:**
- `agentEndpoint: string` - The DigitalOcean agent endpoint URL
- `settings.includeRetrievalInfo?: boolean` - Include retrieval information
- `settings.includeFunctionsInfo?: boolean` - Include functions information  
- `settings.includeGuardrailsInfo?: boolean` - Include guardrails information

## Supported Features

### ✅ Supported
- Text generation (generateText)
- Object generation (generateObject) with JSON schemas
- Tool/function calling with streaming support
- Image input (converted to text descriptions)
- Streaming (streamText) with tool call streaming
- Chat conversations
- System messages
- Custom parameters (temperature, maxTokens, etc.)
- Tool choice configuration
- DigitalOcean-specific metadata

### ❌ Not Supported
- File attachments (not supported by DigitalOcean agent API)
- Image generation
- Text embeddings
- Audio input/output

## Error Handling

The provider includes comprehensive error handling:

```typescript
import { APICallError, TooManyRequestsError } from '@ai-sdk/provider';

try {
  const { text } = await generateText({
    model: digitalocean('https://your-agent-id.ondigitalocean.app'),
    prompt: 'Hello',
  });
} catch (error) {
  if (error instanceof APICallError) {
    console.error('API Error:', error.message, error.statusCode);
  } else if (error instanceof TooManyRequestsError) {
    console.error('Rate limited:', error.message);
  }
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DIGITAL_OCEAN_AI_API_KEY` | Your DigitalOcean AI API key | Yes |

## Requirements

- Node.js 18+
- TypeScript 5.0+ (for TypeScript projects)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin my-feature`
6. Submit a pull request

## Links

- [DigitalOcean Gradient AI Platform](https://docs.digitalocean.com/products/gradient-ai-platform/)
- [Vercel AI SDK](https://ai-sdk.dev)
- [DigitalOcean Agent Documentation](https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-agents/)
