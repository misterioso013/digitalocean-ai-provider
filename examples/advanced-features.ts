import { digitalocean, createDigitalOcean } from '../dist/index';
import { generateText, generateObject, streamText, tool } from 'ai';
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

// Example 2: Object Generation - Structured data extraction
async function objectGenerationExample() {
  console.log('\n=== Object Generation Example ===');

  try {
    const { object } = await generateObject({
      model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
      schema: z.object({
        recipe: z.object({
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
        }),
      }),
      prompt: `Generate a JSON object for a chocolate chip cookie recipe that serves 4 people. 

IMPORTANT: Return ONLY a valid JSON object that matches this structure:
{
  "recipe": {
    "name": "Recipe Name",
    "description": "Brief description",
    "servings": 4,
    "prepTime": "15 minutes",
    "cookTime": "12 minutes",
    "ingredients": [
      {"name": "flour", "quantity": "2", "unit": "cups"},
      {"name": "sugar", "quantity": "1", "unit": "cup"}
    ],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "difficulty": "easy",
    "tags": ["dessert", "cookies"]
  }
}

Do not include any markdown formatting, explanations, or additional text. Return only the JSON object.`,
    });

    console.log('Generated Recipe:');
    console.log(JSON.stringify(object, null, 2));
  } catch (error) {
    console.log('Object generation error:', error.message);
    console.log('This is expected with conversational agents that don\'t follow strict JSON formatting.');
    
    // Fallback: Use generateText for structured content
    console.log('\nTrying alternative approach with generateText...');
    const { text } = await generateText({
      model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
      prompt: 'Create a simple cookie recipe with ingredients and basic steps. Keep it concise.',
    });
    console.log('Alternative response:', text.slice(0, 200) + '...');
  }
}

// Example 3: Tool Streaming - Real-time tool calls
async function toolStreamingExample() {
  console.log('\n=== Tool Streaming Example ===');
  console.log('Note: Some JSON parsing warnings may appear - this is normal for streaming APIs');

  const { textStream, toolCalls } = await streamText({
    model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run'),
    prompt: 'Search for information about artificial intelligence and then summarize the findings.',
    tools: {
      searchWeb: tool({
        description: 'Search the web for information',
        inputSchema: z.object({
          query: z.string().describe('Search query'),
        }),
        execute: async ({ query }) => {
          // Simulate web search
          const results = [
            `AI is the simulation of human intelligence in machines`,
            `Machine learning is a subset of AI`,
            `Deep learning uses neural networks with multiple layers`,
          ];
          return `Search results for "${query}": ${results.join('. ')}`;
        },
      }),
    },
  });

  console.log('Streaming response:');
  let charCount = 0;
  for await (const chunk of textStream) {
    process.stdout.write(chunk);
    charCount += chunk.length;
  }

  console.log(`\nTool calls made: ${(await toolCalls).length}`);
  console.log(`Characters streamed: ${charCount}`);
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
            image: new URL('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Cheeseburger_%2817237580619%29.jpg/640px-Cheeseburger_%2817237580619%29.jpg'),
          },
        ],
      },
    ],
  });

  console.log('Image analysis:', text);
}

// Example 5: Advanced - Combining all features
async function advancedExample() {
  console.log('\n=== Advanced Example - All Features ===');

  try {
    const provider = createDigitalOcean({
      apiKey: process.env.DIGITAL_OCEAN_AI_API_KEY,
      headers: {
        'X-Custom-Header': 'advanced-example',
      },
    });

    // Try with a simpler schema for better compatibility
    const { object } = await generateObject({
      model: provider(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.agents.do-ai.run', {
        includeRetrievalInfo: true,
        includeFunctionsInfo: true,
        includeGuardrailsInfo: true,
      }),
      schema: z.object({
        summary: z.string(),
        keyPoints: z.array(z.string()),
        recommendation: z.string(),
      }),
      prompt: `Generate a JSON object about renewable energy. Return only valid JSON in this format:
{
  "summary": "Brief overview",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "recommendation": "Main recommendation"
}

No markdown, no explanations, just the JSON object.`,
    });

    console.log('Advanced Analysis:');
    console.log(JSON.stringify(object, null, 2));
  } catch (error) {
    console.log('Advanced example error:', error.message);
    console.log('This demonstrates that complex schemas may need agent-specific tuning.');
  }
}

// Run all examples
async function runExamples() {
  const examples = [
    { name: 'Tool Usage', fn: toolUsageExample },
    { name: 'Object Generation', fn: objectGenerationExample },
    { name: 'Tool Streaming', fn: toolStreamingExample },
    { name: 'Image Input', fn: imageInputExample },
    { name: 'Advanced Features', fn: advancedExample },
  ];

  for (const example of examples) {
    try {
      await example.fn();
    } catch (error) {
      console.error(`${example.name} example error:`, error.message);
      console.log('Continuing with next example...\n');
    }
  }
}

// Uncomment to run examples
runExamples();

export {
  toolUsageExample,
  objectGenerationExample,
  toolStreamingExample,
  imageInputExample,
  advancedExample,
  runExamples,
};
