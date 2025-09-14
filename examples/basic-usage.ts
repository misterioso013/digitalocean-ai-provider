import { digitalocean, createDigitalOcean } from '../dist/index';
import { generateText, streamText } from 'ai';
import 'dotenv/config';
// Example 1: Using the default provider instance
async function basicExample() {
  // Make sure to set DIGITAL_OCEAN_AI_API_KEY environment variable
  const { text } = await generateText({
    model: digitalocean(process.env.DIGITAL_OCEAN_AI_API_URL || 'https://your-agent-id.ondigitalocean.app'),
    prompt: 'Olá, tudo bem?',
  });

  console.log('Response:', text);
}

// Example 2: Using a custom provider instance with explicit API key
async function customProviderExample() {
  const customDigitalOcean = createDigitalOcean({
    apiKey: 'your-api-key-here',
    headers: {
      'X-Custom-Header': 'example-value',
    },
  });

  const { text } = await generateText({
    model: customDigitalOcean.chat('https://your-agent-id.ondigitalocean.app'),
    prompt: 'Explain quantum computing in simple terms.',
    temperature: 0.7,
  });

  console.log('Custom provider response:', text);
}

// Example 3: Streaming response
async function streamingExample() {
  const { textStream } = await streamText({
    model: digitalocean('https://your-agent-id.ondigitalocean.app'),
    prompt: 'Write a short story about artificial intelligence.',
  });

  console.log('Streaming response:');
  for await (const chunk of textStream) {
    process.stdout.write(chunk);
  }
  console.log('\n--- End of stream ---');
}

// Example 4: Using DigitalOcean-specific features
async function digitalOceanFeaturesExample() {
  const { text } = await generateText({
    model: digitalocean('https://your-agent-id.ondigitalocean.app', {
      includeRetrievalInfo: true,
      includeFunctionsInfo: true,
      includeGuardrailsInfo: true,
    }),
    prompt: 'Tell me about your knowledge base.',
  });

  console.log('Response with metadata:', text);
}

// Example 5: Error handling
async function errorHandlingExample() {
  try {
    const { text } = await generateText({
      model: digitalocean('https://invalid-agent.ondigitalocean.app'),
      prompt: 'This will fail.',
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error occurred:', error.message);
    }
  }
}

// Run examples (uncomment to test)
basicExample();
// customProviderExample();
// streamingExample();
// digitalOceanFeaturesExample();
// errorHandlingExample();
