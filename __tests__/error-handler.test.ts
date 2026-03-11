import { APICallError } from '@ai-sdk/provider';
import {
  digitalOceanErrorDataSchema,
  handleDigitalOceanError,
  handleDigitalOceanErrorResponse,
} from '../src/digitalocean-error';

const makeResponse = (status: number, statusText: string, headers: Record<string, string> = {}) => {
  const headerMap = new Map(Object.entries(headers));
  return {
    status,
    statusText,
    headers: {
      forEach: (fn: (value: string, key: string) => void) => {
        headerMap.forEach((value, key) => fn(value, key));
      },
    },
    json: () => Promise.resolve({}),
  } as unknown as Response;
};

describe('digitalOceanErrorDataSchema', () => {
  it('validates a correct error response', () => {
    const data = { error: { message: 'Bad request', type: 'invalid_request_error' } };
    const result = digitalOceanErrorDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates a correct error response with optional code', () => {
    const data = { error: { message: 'Not found', type: 'not_found_error', code: '404' } };
    const result = digitalOceanErrorDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid data', () => {
    const result = digitalOceanErrorDataSchema.safeParse({ not: 'valid' });
    expect(result.success).toBe(false);
  });
});

describe('handleDigitalOceanError', () => {
  const requestUrl = 'https://test-agent.agents.do-ai.run/api/v1/chat/completions';
  const requestBody = { messages: [] };

  it('throws retryable APICallError for 429 status', () => {
    const response = makeResponse(429, 'Too Many Requests');
    expect(() => handleDigitalOceanError(new Error('rate limit'), response, requestUrl, requestBody))
      .toThrow(APICallError);

    try {
      handleDigitalOceanError(new Error('rate limit'), response, requestUrl, requestBody);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).isRetryable).toBe(true);
      expect((error as APICallError).statusCode).toBe(429);
    }
  });

  it('throws APICallError for 401 status', () => {
    const response = makeResponse(401, 'Unauthorized');
    expect(() => handleDigitalOceanError(new Error('unauthorized'), response, requestUrl))
      .toThrow(APICallError);

    try {
      handleDigitalOceanError(new Error('unauthorized'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).statusCode).toBe(401);
      expect((error as APICallError).message).toContain('Invalid API key');
    }
  });

  it('throws APICallError for 403 status', () => {
    const response = makeResponse(403, 'Forbidden');
    expect(() => handleDigitalOceanError(new Error('forbidden'), response, requestUrl))
      .toThrow(APICallError);

    try {
      handleDigitalOceanError(new Error('forbidden'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).statusCode).toBe(403);
      expect((error as APICallError).message).toContain('Forbidden');
    }
  });

  it('throws APICallError for 404 status', () => {
    const response = makeResponse(404, 'Not Found');
    expect(() => handleDigitalOceanError(new Error('not found'), response, requestUrl))
      .toThrow(APICallError);

    try {
      handleDigitalOceanError(new Error('not found'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).statusCode).toBe(404);
      expect((error as APICallError).message).toContain('not found');
    }
  });

  it('throws retryable APICallError for 500 status', () => {
    const response = makeResponse(500, 'Internal Server Error');
    expect(() => handleDigitalOceanError(new Error('server error'), response, requestUrl))
      .toThrow(APICallError);

    try {
      handleDigitalOceanError(new Error('server error'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).isRetryable).toBe(true);
      expect((error as APICallError).statusCode).toBe(500);
    }
  });

  it('throws retryable APICallError for 503 status', () => {
    const response = makeResponse(503, 'Service Unavailable');
    expect(() => handleDigitalOceanError(new Error('server error'), response, requestUrl))
      .toThrow(APICallError);

    try {
      handleDigitalOceanError(new Error('server error'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).isRetryable).toBe(true);
    }
  });

  it('throws APICallError for other status codes', () => {
    const response = makeResponse(400, 'Bad Request');
    expect(() => handleDigitalOceanError(new Error('bad request'), response, requestUrl))
      .toThrow(APICallError);

    try {
      handleDigitalOceanError(new Error('bad request'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).statusCode).toBe(400);
    }
  });

  it('handles non-Error cause', () => {
    const response = makeResponse(429, 'Too Many Requests');
    expect(() => handleDigitalOceanError('string error', response, requestUrl))
      .toThrow(APICallError);
  });

  it('includes response headers', () => {
    const response = makeResponse(429, 'Too Many Requests', { 'retry-after': '5' });
    try {
      handleDigitalOceanError(new Error('rate limit'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).responseHeaders?.['retry-after']).toBe('5');
    }
  });

  it('uses "Unknown error" when statusText is empty', () => {
    const response = makeResponse(418, '');
    try {
      handleDigitalOceanError(new Error('error'), response, requestUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(APICallError);
      expect((error as APICallError).message).toBe('Unknown error');
    }
  });
});

describe('handleDigitalOceanErrorResponse', () => {
  const requestUrl = 'https://test-agent.agents.do-ai.run/api/v1/chat/completions';

  it('parses error from JSON response body', async () => {
    const response = {
      status: 400,
      statusText: 'Bad Request',
      headers: { forEach: jest.fn() },
      json: () => Promise.resolve({
        error: { message: 'Invalid request', type: 'invalid_request_error' },
      }),
    } as unknown as Response;

    await expect(
      handleDigitalOceanErrorResponse(new Error('error'), response, requestUrl)
    ).rejects.toThrow(APICallError);
  });

  it('falls back to handleDigitalOceanError when JSON parse fails', async () => {
    const response = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { forEach: jest.fn() },
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response;

    await expect(
      handleDigitalOceanErrorResponse(new Error('error'), response, requestUrl)
    ).rejects.toThrow(APICallError);
  });

  it('falls back when JSON body is not a valid error schema', async () => {
    const response = {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: { forEach: jest.fn() },
      json: () => Promise.resolve({ not_error: true }),
    } as unknown as Response;

    await expect(
      handleDigitalOceanErrorResponse(new Error('error'), response, requestUrl)
    ).rejects.toThrow(APICallError);
  });
});
