import { RadiusRequest, RadiusResponse, RequestBody } from "@radius/core";

/**
 * Browser-compatible Request Runner Adapter.
 * 
 * This mimics the server-side RequestRunner from @radius/core but uses
 * the browser's native fetch API. This allows us to develop the UI
 * logic without needing the full Nodejs/Tauri backend running.
 */
export const browserRequestRunner = {
    async execute(request: RadiusRequest): Promise<RadiusResponse> {
        const start = performance.now();

        try {
            // 1. Serialize Body
            const { body, contentType } = serializeBody(request.request.body);

            // 2. Prepare Headers
            const headers: Record<string, string> = {};
            if (request.request.headers) {
                if (Array.isArray(request.request.headers)) {
                    request.request.headers.forEach(h => {
                        if (h.enabled !== false && h.key) {
                            headers[h.key] = h.value;
                        }
                    });
                } else {
                    Object.assign(headers, request.request.headers);
                }
            }

            if (contentType && !headers['Content-Type'] && !headers['content-type']) {
                headers['Content-Type'] = contentType;
            }

            // 3. Execute Fetch
            const fetchOptions: RequestInit = {
                method: request.request.method,
                headers: headers,
                body: body
            };

            const res = await fetch(request.request.url, fetchOptions);

            // 4. Process Response
            const text = await res.text();
            const end = performance.now();

            let json = null;
            try {
                if (res.headers.get('content-type')?.includes('application/json')) {
                    json = JSON.parse(text);
                }
            } catch {
                // Ignore parsing errors
            }

            const responseHeaders: Record<string, string> = {};
            res.headers.forEach((val, key) => {
                responseHeaders[key] = val;
            });

            const statusText = res.statusText || STATUS_CODES[res.status] || 'Unknown Status';

            return {
                status: res.status,
                statusText: statusText,
                headers: responseHeaders,
                body: text,
                json: json,
                timing: {
                    total: Math.round(end - start),
                    ttfb: 0,
                    download: 0
                },
                request: {
                    method: request.request.method,
                    url: request.request.url,
                    headers: headers
                }
            };

        } catch (e) {
            return {
                status: 0,
                statusText: "Network Error",
                headers: {},
                body: (e as Error).message,
                json: null,
                timing: { total: 0 },
                request: {
                    method: request.request.method,
                    url: request.request.url,
                    headers: normalizeHeaders(request.request.headers)
                }
            };
        }
    }
};

function normalizeHeaders(headers: any): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) return result;
    if (Array.isArray(headers)) {
        headers.forEach(h => {
            if (h.enabled !== false && h.key) {
                result[h.key] = h.value;
            }
        });
    } else {
        Object.assign(result, headers);
    }
    return result;
}

function serializeBody(body?: RequestBody): { body: BodyInit | null, contentType: string | null | undefined } {
    if (!body || body.type === 'none') return { body: null, contentType: null };

    // V2 Schema Handling
    if (body.type) {
        switch (body.type) {
            case 'json':
                return {
                    body: body.text || JSON.stringify((body as any).content || {}),
                    contentType: 'application/json'
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
                    body: body.text || '',
                    contentType: types[body.type as keyof typeof types] || 'text/plain'
                };
            case 'form-data':
                const formData = new FormData();
                if (body.form && Array.isArray(body.form)) {
                    body.form.forEach(f => {
                        if (f.enabled !== false) formData.append(f.key, f.value);
                    });
                }
                return { body: formData, contentType: undefined };
            case 'urlencoded':
                const params = new URLSearchParams();
                if (body.form && Array.isArray(body.form)) {
                    body.form.forEach(f => {
                        if (f.enabled !== false) params.append(f.key, f.value);
                    });
                }
                return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' };
            case 'graphql':
                if (body.graphql) {
                    return {
                        body: JSON.stringify({
                            query: body.graphql.query,
                            variables: body.graphql.variables ? JSON.parse(body.graphql.variables) : {}
                        }),
                        contentType: 'application/json'
                    };
                }
                // Fallback for graphql if body.graphql is not set
                return { body: body.text || '', contentType: 'application/json' };
            default:
                return { body: null, contentType: null };
        }
    }

    // Unrecognized format
    return { body: null, contentType: null };
}

const STATUS_CODES: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
};
