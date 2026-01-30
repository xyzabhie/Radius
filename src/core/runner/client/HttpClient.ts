/**
 * HTTP Client using undici with timing metrics.
 * 
 * Executes HTTP requests and captures detailed timing information.
 */

import { request, Dispatcher } from 'undici';
import type {
    RadiusRequest,
    RadiusResponse,
    RequestTiming,
    RequestBody,
    AuthConfig,
    HttpMethod,
} from '../types.js';

/**
 * Options for HttpClient.
 */
export interface HttpClientOptions {
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
}

/**
 * HTTP client that executes requests and captures timing metrics.
 */
export class HttpClient {
    private readonly timeout: number;

    constructor(options: HttpClientOptions = {}) {
        this.timeout = options.timeout ?? 30000;
    }

    /**
     * Execute an HTTP request.
     * @param req - The resolved Radius request
     * @returns RadiusResponse with timing metrics
     */
    async execute(req: RadiusRequest): Promise<RadiusResponse> {
        const startTime = performance.now();
        let headersReceivedTime: number | undefined;

        // Build request options
        const url = req.request.url;
        const method = req.request.method;
        const headers = this.buildHeaders(req);
        const body = this.serializeBody(req.request.body);

        try {
            const response = await request(url, {
                method: method as Dispatcher.HttpMethod,
                headers,
                body: body?.content,
                headersTimeout: this.timeout,
                bodyTimeout: this.timeout,
            });

            headersReceivedTime = performance.now();

            // Read response body
            const responseBody = await response.body.text();
            const endTime = performance.now();

            // Parse JSON if possible
            let jsonBody: unknown | null = null;
            const contentType = response.headers['content-type'];
            if (contentType && contentType.includes('application/json')) {
                try {
                    jsonBody = JSON.parse(responseBody);
                } catch {
                    // Not valid JSON, leave as null
                }
            }

            // Build timing metrics
            const timing: RequestTiming = {
                total: Math.round(endTime - startTime),
                ttfb: headersReceivedTime ? Math.round(headersReceivedTime - startTime) : undefined,
                download: headersReceivedTime ? Math.round(endTime - headersReceivedTime) : undefined,
            };

            // Convert headers to Record<string, string>
            const responseHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(response.headers)) {
                if (value !== undefined) {
                    responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
                }
            }

            return {
                status: response.statusCode,
                statusText: this.getStatusText(response.statusCode),
                headers: responseHeaders,
                body: responseBody,
                json: jsonBody,
                timing,
                request: {
                    method,
                    url,
                    headers,
                },
            };
        } catch (error) {
            const endTime = performance.now();
            const message = error instanceof Error ? error.message : 'Unknown error';

            // Return error response
            return {
                status: 0,
                statusText: 'Error',
                headers: {},
                body: message,
                json: null,
                timing: {
                    total: Math.round(endTime - startTime),
                },
                request: {
                    method,
                    url,
                    headers,
                },
            };
        }
    }

    /**
     * Build headers including auth.
     */
    private buildHeaders(req: RadiusRequest): Record<string, string> {
        const headers: Record<string, string> = { ...req.request.headers };

        // Add body content-type if not set
        if (req.request.body && !headers['Content-Type'] && !headers['content-type']) {
            const bodyInfo = this.serializeBody(req.request.body);
            if (bodyInfo?.contentType) {
                headers['Content-Type'] = bodyInfo.contentType;
            }
        }

        // Add auth headers
        if (req.auth) {
            this.applyAuth(headers, req.auth);
        }

        return headers;
    }

    /**
     * Apply authentication to headers.
     */
    private applyAuth(headers: Record<string, string>, auth: AuthConfig): void {
        switch (auth.type) {
            case 'bearer':
                if (auth.token) {
                    headers['Authorization'] = `Bearer ${auth.token}`;
                }
                break;
            case 'basic':
                if (auth.username && auth.password) {
                    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
            case 'api-key':
                if (auth.key && auth.value && auth.in === 'header') {
                    headers[auth.key] = auth.value;
                }
                break;
        }
    }

    /**
     * Serialize request body based on format.
     */
    private serializeBody(body?: RequestBody): { content: string; contentType: string } | undefined {
        if (!body) {
            return undefined;
        }

        switch (body.format) {
            case 'json':
                return {
                    content: JSON.stringify(body.content),
                    contentType: 'application/json',
                };
            case 'form':
                return {
                    content: new URLSearchParams(body.content as Record<string, string>).toString(),
                    contentType: 'application/x-www-form-urlencoded',
                };
            case 'graphql':
                return {
                    content: JSON.stringify({
                        query: body.query,
                        variables: body.variables,
                    }),
                    contentType: 'application/json',
                };
            case 'raw':
                return {
                    content: String(body.content),
                    contentType: 'text/plain',
                };
            case 'multipart':
                // Multipart would require FormData - simplified for now
                return {
                    content: JSON.stringify(body.content),
                    contentType: 'multipart/form-data',
                };
            default:
                return undefined;
        }
    }

    /**
     * Get status text for HTTP status code.
     */
    private getStatusText(status: number): string {
        const statusTexts: Record<number, string> = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            301: 'Moved Permanently',
            302: 'Found',
            304: 'Not Modified',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        };
        return statusTexts[status] ?? 'Unknown';
    }
}
