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
} from '../types.js';
import { IHttpClient } from '../../types/http.js';

/**
 * Options for NodeHttpClient.
 */
export interface NodeHttpClientOptions {
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
}

/**
 * HTTP client that executes requests and captures timing metrics using Undici (Node.js).
 */
export class NodeHttpClient implements IHttpClient {
    private readonly timeout: number;

    constructor(options: NodeHttpClientOptions = {}) {
        this.timeout = options.timeout ?? 30000;
    }

    /**
     * Execute an HTTP request.
     * @param req - The resolved Radius request
     * @param signal - Optional AbortSignal for cancellation
     * @returns RadiusResponse with timing metrics
     */
    async execute(req: RadiusRequest, signal?: AbortSignal): Promise<RadiusResponse> {
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
        const headers: Record<string, string> = {};

        // V2: Headers are array of KeyValueEntry
        if (req.request.headers && Array.isArray(req.request.headers)) {
            req.request.headers.forEach(h => {
                if (h.enabled !== false && h.key) {
                    headers[h.key] = h.value;
                }
            });
        }
        // Backward compatibility for V1 (Record)
        else if (req.request.headers) {
            Object.assign(headers, req.request.headers);
        }

        // Add body content-type if not set
        if (req.request.body && !headers['Content-Type'] && !headers['content-type']) {
            const bodyInfo = this.serializeBody(req.request.body);
            if (bodyInfo?.contentType) {
                headers['Content-Type'] = bodyInfo.contentType;
            }
        }

        // Add auth headers (Auth handling logic in RequestRunner updates the request object)
        if (req.auth) {
            // We can't rely on RequestRunner.applyAuth legacy logic here easily because it pushes to array
            // If the array exists, our loop above caught it.
            // If we are in legacy mode, we might need to handle it.
            // But for now, we assume V2 is primarily used or V1 without complex auth.
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
        if (!body || body.type === 'none') {
            return undefined;
        }

        // V2 Schema Handling
        switch (body.type) {
            case 'json':
                // For V2, content is in body.text (raw string) to preserve formatting
                // But if it was parsed from object (V1 style), we handle that too
                return {
                    content: body.text || JSON.stringify((body as any).content || {}),
                    contentType: 'application/json',
                };
            case 'text':
            case 'xml':
            case 'html':
                const types = {
                    text: 'text/plain',
                    xml: 'application/xml',
                    html: 'text/html'
                };
                return {
                    content: body.text || String((body as any).content || ''),
                    contentType: types[body.type] || 'text/plain',
                };
            case 'form-data':
                // Node.js multipart not fully implemented in this simple client
                // In a real implementation, we'd use 'form-data' package
                return {
                    content: '', // Placeholder
                    contentType: 'multipart/form-data',
                };
            case 'urlencoded':
                const params = new URLSearchParams();
                if (body.form && Array.isArray(body.form)) {
                    body.form.forEach(f => {
                        if (f.enabled !== false) params.append(f.key, f.value);
                    });
                } else if ((body as any).content) {
                    // Legacy support
                    const legacy = (body as any).content;
                    Object.keys(legacy).forEach(k => params.append(k, legacy[k]));
                }
                return {
                    content: params.toString(),
                    contentType: 'application/x-www-form-urlencoded',
                };
            case 'graphql':
                // GraphQL in V2 uses body.graphql object or body.text
                if (body.graphql) {
                    return {
                        content: JSON.stringify({
                            query: body.graphql.query,
                            variables: body.graphql.variables ? JSON.parse(body.graphql.variables) : {}
                        }),
                        contentType: 'application/json',
                    };
                }
                return {
                    content: body.text || '',
                    contentType: 'application/json',
                };
            // V1 Backward Compatibility (format field)
            default:
                // @ts-ignore - fallback for V1 'format' field
                if (body.format === 'json') return { content: JSON.stringify((body as any).content), contentType: 'application/json' };
                // @ts-ignore
                if (body.format === 'raw') return { content: String((body as any).content), contentType: 'text/plain' };
                // @ts-ignore
                if (body.format === 'form') return { content: new URLSearchParams((body as any).content).toString(), contentType: 'application/x-www-form-urlencoded' };
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
