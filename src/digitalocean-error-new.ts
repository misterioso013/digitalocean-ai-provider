import { z } from 'zod';
import { APICallError } from '@ai-sdk/provider';

/**
 * Schema for DigitalOcean error responses
 */
export const digitalOceanErrorDataSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string(),
    code: z.string().optional(),
  }),
});

export type DigitalOceanErrorData = z.infer<typeof digitalOceanErrorDataSchema>;

/**
 * Custom error handler for DigitalOcean-specific errors
 */
export function handleDigitalOceanError(
  error: unknown,
  response: Response,
  requestUrl: string,
  requestBody?: unknown
): never {
  const status = response.status;
  const errorCause = error instanceof Error ? error : new Error(String(error));
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const url = requestUrl;
  const requestBodyValues = requestBody ?? {};

  if (status === 429) {
    throw new APICallError({
      message: 'Too many requests',
      url,
      requestBodyValues,
      statusCode: status,
      responseHeaders,
      cause: errorCause,
      isRetryable: true,
    });
  }

  if (status === 401) {
    throw new APICallError({
      message: 'Invalid API key or unauthorized access',
      url,
      requestBodyValues,
      statusCode: status,
      responseHeaders,
      cause: errorCause,
    });
  }

  if (status === 403) {
    throw new APICallError({
      message: 'Forbidden: Check your API key permissions',
      url,
      requestBodyValues,
      statusCode: status,
      responseHeaders,
      cause: errorCause,
    });
  }

  if (status === 404) {
    throw new APICallError({
      message: 'Agent endpoint not found. Verify the agent URL',
      url,
      requestBodyValues,
      statusCode: status,
      responseHeaders,
      cause: errorCause,
    });
  }

  if (status >= 500) {
    throw new APICallError({
      message: 'DigitalOcean server error',
      url,
      requestBodyValues,
      statusCode: status,
      responseHeaders,
      cause: errorCause,
      isRetryable: true,
    });
  }

  // For any other status codes
  throw new APICallError({
    message: response.statusText || 'Unknown error',
    url,
    requestBodyValues,
    statusCode: status,
    responseHeaders,
    cause: errorCause,
  });
}

/**
 * Handle DigitalOcean errors from response body
 */
export async function handleDigitalOceanErrorResponse(
  error: unknown,
  response: Response,
  requestUrl: string,
  requestBody?: unknown
): Promise<never> {
  try {
    const json = await response.json();
    const errorData = digitalOceanErrorDataSchema.parse(json);
    handleDigitalOceanError(
      new Error(errorData.error.message),
      response,
      requestUrl,
      requestBody
    );
  } catch (e) {
    handleDigitalOceanError(error, response, requestUrl, requestBody);
  }
  throw new Error('Failed response handler did not throw');
}
