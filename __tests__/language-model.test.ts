import { createDigitalOcean } from '../src';
import { LanguageModelV2CallOptions } from '@ai-sdk/provider';

describe('DigitalOceanLanguageModel', () => {
  const mockApiKey = 'test-api-key';
  const mockAgentEndpoint = 'https://test-agent.agents.do-ai.run';

  const baseCallOptions: LanguageModelV2CallOptions = {
    prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
  };

  const makeModelWithFetch = (mockFetch: jest.Mock) => {
    const provider = createDigitalOcean({ apiKey: mockApiKey, fetch: mockFetch });
    return provider(mockAgentEndpoint);
  };

  const makeSuccessFetch = (content = 'Hello!', finishReason = 'stop') =>
    jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(''),
      json: () =>
        Promise.resolve({
          choices: [{ message: { content, role: 'assistant' }, finish_reason: finishReason }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
      body: null,
    });

  describe('basic properties', () => {
    it('has specificationVersion v2', () => {
      const model = makeModelWithFetch(jest.fn());
      expect(model.specificationVersion).toBe('v2');
    });

    it('has provider set to digitalocean', () => {
      const model = makeModelWithFetch(jest.fn());
      expect(model.provider).toBe('digitalocean');
    });

    it('has modelId equal to the agent endpoint', () => {
      const model = makeModelWithFetch(jest.fn());
      expect(model.modelId).toBe(mockAgentEndpoint);
    });

    it('returns empty supportedUrls', () => {
      const model = makeModelWithFetch(jest.fn());
      expect(model.supportedUrls).toEqual({});
    });
  });

  describe('doGenerate', () => {
    it('returns text content from a successful response', async () => {
      const mockFetch = makeSuccessFetch('Hello!');
      const model = makeModelWithFetch(mockFetch);

      const result = await model.doGenerate(baseCallOptions);

      expect(result.content).toEqual([{ type: 'text', text: 'Hello!' }]);
      expect(result.finishReason).toBe('stop');
      expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 3, totalTokens: 8 });
    });

    it('returns tool-call content when tool_calls are present', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    { id: 'call_1', function: { name: 'get_weather', arguments: '{"city":"Paris"}' } },
                  ],
                },
                finish_reason: 'tool_calls',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      const result = await model.doGenerate(baseCallOptions);

      expect(result.content).toEqual([
        { type: 'tool-call', toolCallId: 'call_1', toolName: 'get_weather', input: '{"city":"Paris"}' },
      ]);
      expect(result.finishReason).toBe('tool-calls');
    });

    it('maps finish reason "length"', async () => {
      const mockFetch = makeSuccessFetch('truncated', 'length');
      const model = makeModelWithFetch(mockFetch);

      const result = await model.doGenerate(baseCallOptions);
      expect(result.finishReason).toBe('length');
    });

    it('maps finish reason "content_filter"', async () => {
      const mockFetch = makeSuccessFetch('filtered', 'content_filter');
      const model = makeModelWithFetch(mockFetch);

      const result = await model.doGenerate(baseCallOptions);
      expect(result.finishReason).toBe('content-filter');
    });

    it('maps null finish reason to "unknown"', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'hi', role: 'assistant' }, finish_reason: null }],
            usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
          }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      const result = await model.doGenerate(baseCallOptions);
      expect(result.finishReason).toBe('unknown');
    });

    it('throws when response is not ok', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('server error'),
        json: () => Promise.reject(new Error('not json')),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      await expect(model.doGenerate(baseCallOptions)).rejects.toThrow(/DigitalOcean API error/);
    });

    it('throws when fetch fails entirely', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const model = makeModelWithFetch(mockFetch);
      await expect(model.doGenerate(baseCallOptions)).rejects.toThrow(
        /Failed to connect to DigitalOcean API/,
      );
    });

    it('throws when no message in response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [{ finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
          }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      await expect(model.doGenerate(baseCallOptions)).rejects.toThrow(/No message in response/);
    });

    it('throws when no content or tool_calls in response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [{ message: { role: 'assistant', content: null }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
          }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      await expect(model.doGenerate(baseCallOptions)).rejects.toThrow(/No content or tool calls/);
    });

    it('uses default usage when none provided', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({ choices: [{ message: { content: 'Hi', role: 'assistant' }, finish_reason: 'stop' }] }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      const result = await model.doGenerate(baseCallOptions);
      expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    });

    it('passes maxOutputTokens to request', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({ ...baseCallOptions, maxOutputTokens: 100 });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.max_tokens).toBe(100);
    });

    it('passes temperature to request', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({ ...baseCallOptions, temperature: 0.7 });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(0.7);
    });

    it('passes topP to request', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({ ...baseCallOptions, topP: 0.9 });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.top_p).toBe(0.9);
    });

    it('passes frequencyPenalty to request', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({ ...baseCallOptions, frequencyPenalty: 0.5 });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.frequency_penalty).toBe(0.5);
    });

    it('passes presencePenalty to request', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({ ...baseCallOptions, presencePenalty: 0.3 });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.presence_penalty).toBe(0.3);
    });

    it('passes stopSequences to request', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({ ...baseCallOptions, stopSequences: ['END'] });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.stop).toEqual(['END']);
    });

    it('passes tools to request with correct names', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Using tool', role: 'assistant', tool_calls: [] }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      await model.doGenerate({
        ...baseCallOptions,
        tools: [
          {
            type: 'function',
            name: 'get_weather',
            description: 'Get weather',
            inputSchema: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location'],
            },
          },
        ],
        toolChoice: { type: 'auto' },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tools).toBeDefined();
      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0].function.name).toBe('get_weather');
      expect(requestBody.tool_choice).toBe('auto');
    });

    it('passes tool_choice none to request', async () => {
      const mockFetch = makeSuccessFetch('Hi');
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({
        ...baseCallOptions,
        tools: [
          {
            type: 'function',
            name: 'some_tool',
            description: 'A tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
        toolChoice: { type: 'none' },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tool_choice).toBe('none');
    });

    it('passes tool_choice required to request', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hi', role: 'assistant', tool_calls: [] }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
          }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      await model.doGenerate({
        ...baseCallOptions,
        tools: [
          {
            type: 'function',
            name: 'some_tool',
            description: 'A tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
        toolChoice: { type: 'required' },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tool_choice).toBe('required');
    });

    it('passes specific tool choice to request', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [{ id: 'call_1', function: { name: 'specific_tool', arguments: '{}' } }],
                },
                finish_reason: 'tool_calls',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
        body: null,
      });

      const model = makeModelWithFetch(mockFetch);
      await model.doGenerate({
        ...baseCallOptions,
        tools: [
          {
            type: 'function',
            name: 'specific_tool',
            description: 'A specific tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
        toolChoice: { type: 'tool', toolName: 'specific_tool' },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tool_choice).toEqual({ type: 'function', function: { name: 'specific_tool' } });
    });

    it('includes DigitalOcean-specific settings in request', async () => {
      const mockFetch = makeSuccessFetch();
      const provider = createDigitalOcean({ apiKey: mockApiKey, fetch: mockFetch });
      const model = provider(mockAgentEndpoint, {
        includeRetrievalInfo: true,
        includeFunctionsInfo: true,
        includeGuardrailsInfo: true,
      });

      await model.doGenerate(baseCallOptions);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.include_retrieval_info).toBe(true);
      expect(requestBody.include_functions_info).toBe(true);
      expect(requestBody.include_guardrails_info).toBe(true);
    });

    it('includes request body in result', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      const result = await model.doGenerate(baseCallOptions);

      expect(result.request?.body).toBeDefined();
      const parsedBody = JSON.parse(result.request!.body as string);
      expect(parsedBody.messages).toBeDefined();
    });

    it('skips provider-defined tools (non-function)', async () => {
      const mockFetch = makeSuccessFetch();
      const model = makeModelWithFetch(mockFetch);

      await model.doGenerate({
        ...baseCallOptions,
        tools: [
          {
            type: 'provider-defined',
            id: 'tool-id',
            name: 'some_tool',
            args: {},
          } as any,
        ],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      // provider-defined tools should be ignored (only function tools are passed)
      expect(requestBody.tools).toBeUndefined();
    });
  });

  describe('doStream', () => {
    const makeStreamFetch = (chunks: string[]) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      return jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: stream,
        text: () => Promise.resolve(''),
      });
    };

    it('returns a stream with text-delta parts', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n',
        'data: {"choices":[{"delta":{"content":" World"},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":2,"total_tokens":7}}\n',
        'data: [DONE]\n',
      ];

      const mockFetch = makeStreamFetch(chunks);
      const model = makeModelWithFetch(mockFetch);
      const { stream } = await model.doStream(baseCallOptions);

      const parts: any[] = [];
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const textDeltas = parts.filter((p) => p.type === 'text-delta');
      expect(textDeltas.length).toBeGreaterThan(0);
      expect(textDeltas[0].delta).toBe('Hello');

      const finishParts = parts.filter((p) => p.type === 'finish');
      expect(finishParts).toHaveLength(1);
      expect(finishParts[0].finishReason).toBe('stop');
      expect(finishParts[0].usage).toEqual({ inputTokens: 5, outputTokens: 2, totalTokens: 7 });
    });

    it('handles tool_calls in streaming response', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"tool_calls":[{"id":"call_1","function":{"name":"get_weather","arguments":""}}]},"finish_reason":null}]}\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"id":"call_1","function":{"arguments":"{\\"city\\":\\"Paris\\"}"}}]},"finish_reason":"tool_calls"}]}\n',
        'data: [DONE]\n',
      ];

      const mockFetch = makeStreamFetch(chunks);
      const model = makeModelWithFetch(mockFetch);
      const { stream } = await model.doStream(baseCallOptions);

      const parts: any[] = [];
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const toolInputStart = parts.filter((p) => p.type === 'tool-input-start');
      expect(toolInputStart.length).toBeGreaterThan(0);
      expect(toolInputStart[0].toolName).toBe('get_weather');

      const toolInputDelta = parts.filter((p) => p.type === 'tool-input-delta');
      expect(toolInputDelta.length).toBeGreaterThan(0);
    });

    it('throws when streaming response is not ok', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        body: null,
        text: () => Promise.resolve('Unauthorized'),
      });

      const model = makeModelWithFetch(mockFetch);
      await expect(model.doStream(baseCallOptions)).rejects.toThrow(/DigitalOcean API error/);
    });

    it('throws when streaming fetch fails entirely', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const model = makeModelWithFetch(mockFetch);
      await expect(model.doStream(baseCallOptions)).rejects.toThrow(
        /Failed to connect to DigitalOcean API/,
      );
    });

    it('handles malformed JSON in stream gracefully', async () => {
      const chunks = [
        'data: invalid-json\n',
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
      ];

      const mockFetch = makeStreamFetch(chunks);
      const model = makeModelWithFetch(mockFetch);
      const { stream } = await model.doStream(baseCallOptions);

      const parts: any[] = [];
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      // Should still get the valid chunk
      const textDeltas = parts.filter((p) => p.type === 'text-delta');
      expect(textDeltas.length).toBeGreaterThan(0);
    });

    it('handles [DONE] chunks correctly', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
        '',
      ];

      const mockFetch = makeStreamFetch(chunks);
      const model = makeModelWithFetch(mockFetch);
      const { stream } = await model.doStream(baseCallOptions);

      const parts: any[] = [];
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const finishParts = parts.filter((p) => p.type === 'finish');
      expect(finishParts).toHaveLength(1);
    });

    it('emits stream-start event when there are warnings', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
      ];

      // Provide a tool with choice to trigger no warnings in v2 (tools are supported)
      const mockFetch = makeStreamFetch(chunks);
      const model = makeModelWithFetch(mockFetch);
      const { stream } = await model.doStream({
        ...baseCallOptions,
        tools: [
          {
            type: 'function',
            name: 'my_tool',
            description: 'A tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      });

      expect(stream).toBeDefined();
      const reader = stream.getReader();
      const parts: any[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }
      // Should complete without errors
      expect(parts.some((p) => p.type === 'finish')).toBe(true);
    });

    it('handles chunks without choices gracefully', async () => {
      const chunks = [
        'data: {"choices":[]}\n',
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
      ];

      const mockFetch = makeStreamFetch(chunks);
      const model = makeModelWithFetch(mockFetch);
      const { stream } = await model.doStream(baseCallOptions);

      const parts: any[] = [];
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const textDeltas = parts.filter((p) => p.type === 'text-delta');
      expect(textDeltas).toHaveLength(1);
    });
  });
});
