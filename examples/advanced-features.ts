import { digitalocean, createDigitalOcean } from '../dist/index';
import { generateText, streamText, tool, Output, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import 'dotenv/config';

/**
 * DigitalOcean AI Provider - Advanced Features Examples
 * 
 * NOTE: Object generation (generateObject) works best with agents specifically 
 * trained for structured output. Some conversational agents may return formatted 
 * text instead of pure JSON, which will cause parsing errors. This is expected
 * behavior and demonstrates the difference between conversational and structured AI.
 */

// Example 1: Tool Usage - Define custom tools
async function toolUsageExample() {
  console.log('=== Tool Usage Example ===');
  
  const { text, toolCalls, toolResults } = await generateText({
    model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
    prompt: 'What is the weather like in San Francisco? Then calculate the tip for a $50 bill.',
    tools: {
      getWeather: tool({
        description: 'Get the current weather for a location',
        inputSchema: z.object({
          location: z.string().describe('The location to get weather for'),
        }),
        execute: async ({ location }) => {
          // Simulate weather API call
          const weatherData = {
            location,
            temperature: 72,
            condition: 'Sunny',
            humidity: 65,
          };
          return `Weather in ${location}: ${weatherData.temperature}°F, ${weatherData.condition}, Humidity: ${weatherData.humidity}%`;
        },
      }),
      calculateTip: tool({
        description: 'Calculate tip amount for a bill',
        inputSchema: z.object({
          billAmount: z.number().describe('The bill amount in dollars'),
          tipPercentage: z.number().default(20).describe('Tip percentage (default 20%)'),
        }),
        execute: async ({ billAmount, tipPercentage }) => {
          const tipAmount = (billAmount * tipPercentage) / 100;
          const total = billAmount + tipAmount;
          return `Bill: $${billAmount}, Tip (${tipPercentage}%): $${tipAmount.toFixed(2)}, Total: $${total.toFixed(2)}`;
        },
      }),
    },
  });

  console.log('Response:', text);
  console.log('Tool Calls:', toolCalls.length);
  console.log('Tool Results:', toolResults.length);
}

// Example 2: Object Generation - Structured output using Output.object()
async function objectGenerationExample() {
  console.log('\n=== Object Generation Example ===');

  const recipeSchema = z.object({
    name: z.string(),
    description: z.string(),
    servings: z.number(),
    prepTime: z.string(),
    cookTime: z.string(),
    ingredients: z.array(z.object({
      name: z.string(),
      quantity: z.string(),
      unit: z.string(),
    })),
    instructions: z.array(z.string()),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()),
  });

  try {
    const { output } = await generateText({
      model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
      prompt: 'Generate a chocolate chip cookie recipe that serves 4 people.',
    });

    console.log('Generated Recipe:');
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.log('NoObjectGeneratedError — could not parse structured output.');
      console.log('Text:', error.text?.slice(0, 200));
    } else {
      console.log('Object generation error:', error instanceof Error ? error.message : String(error));
    }
    console.log('This is expected with conversational agents not tuned for structured output.');
  }
}

// Example 3: Array Streaming - Output.array() with elementStream
async function arrayStreamingExample() {
  console.log('\n=== Array Streaming Example ===');

  const { elementStream } = streamText({
    model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
    output: Output.array({
      element: z.object({
        name: z.string(),
        class: z.enum(['warrior', 'mage', 'rogue', 'healer']),
        description: z.string(),
        specialAbility: z.string(),
      }),
    }),
    prompt: 'Generate 3 hero descriptions for a fantasy role playing game.',
  });

  let heroCount = 0;
  for await (const hero of elementStream) {
    heroCount++;
    console.log(`\nHero ${heroCount}:`);
    console.log(JSON.stringify(hero, null, 2));
  }
  console.log(`\nTotal heroes generated: ${heroCount}`);
}

// Example 4: Image Input - Multimodal support
async function imageInputExample() {
  console.log('\n=== Image Input Example ===');

  const { text } = await generateText({
    model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What do you see in this image?' },
          {
            type: 'image',
            image: new URL('https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=640'),
          },
        ],
      },
    ],
  });

  console.log('Image analysis:', text);
}

// Example 5: Advanced - Output.choice() and Output.json()
async function advancedExample() {
  console.log('\n=== Advanced Example - Output.choice() and Output.json() ===');

  const provider = createDigitalOcean({
    apiKey: process.env.DIGITAL_OCEAN_AI_API_KEY,
    headers: { 'X-Custom-Header': 'advanced-example' },
  });

  // 5a: Output.choice() — classification
  console.log('\n-- Output.choice(): Sentiment Analysis --');
  try {
    const { output: sentiment } = await generateText({
      model: provider(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
      output: Output.choice({ options: ['positive', 'negative', 'neutral'] as const }),
      prompt: 'Classify the sentiment: "I love how easy it is to use this product!"',
    });
    console.log('Sentiment:', sentiment); // 'positive' | 'negative' | 'neutral'
  } catch (error) {
    console.log('Choice error:', error instanceof Error ? error.message : String(error));
  }

  // 5b: Output.json() — unstructured JSON
  console.log('\n-- Output.json(): Weather JSON --');
  try {
    const { output: weatherJson } = await generateText({
      model: provider(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run', {
        includeRetrievalInfo: true,
      }),
      output: Output.json(),
      prompt: 'Return a JSON object with the current temperature and condition for San Francisco and Paris.',
    });
    console.log('Weather JSON:', JSON.stringify(weatherJson, null, 2));
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.log('NoObjectGeneratedError — raw text:', error.text?.slice(0, 200));
    } else {
      console.log('JSON error:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Run all examples
async function runExamples() {
  const examples = [
    { name: 'Tool Usage', fn: toolUsageExample },
    { name: 'Object Generation', fn: objectGenerationExample },
    { name: 'Array Streaming', fn: arrayStreamingExample },
    { name: 'Image Input', fn: imageInputExample },
    { name: 'Advanced Features', fn: advancedExample },
  ];

  for (const example of examples) {
    try {
      await example.fn();
    } catch (error) {
      console.error(`${example.name} example error:`, error instanceof Error ? error.message : String(error));
      console.log('Continuing with next example...\n');
    }
  }
}

// Uncomment to run examples
runExamples();

export {
  toolUsageExample,
  objectGenerationExample,
  arrayStreamingExample,
  imageInputExample,
  advancedExample,
  runExamples,
};
