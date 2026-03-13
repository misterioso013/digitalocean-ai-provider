import { ModelMessage, streamText } from 'ai';
import { digitalocean } from '../dist/index';
import 'dotenv/config';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

const agentEndpoint =
  process.env.DIGITAL_OCEAN_AI_API_URL ?? '';

async function main() {
  if (!agentEndpoint) {
    console.error(
      'Error: DIGITAL_OCEAN_AI_API_URL environment variable is not set.\n' +
        'Example: https://<agent-id>.agents.do-ai.run',
    );
    process.exit(1);
  }

  const model = digitalocean(agentEndpoint);

  console.log('Chat started. Type your message and press Enter. Use Ctrl+C to exit.\n');

  while (true) {
    const userInput = await terminal.question('You: ');

    messages.push({ role: 'user', content: userInput });

    const result = streamText({
      model,
      messages,
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write('\n\n');

    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
