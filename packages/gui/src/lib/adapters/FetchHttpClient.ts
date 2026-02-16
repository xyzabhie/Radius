import { IHttpClient, RadiusRequest, RadiusResponse, RequestBody } from "@radius/core";
import { fetch } from '@tauri-apps/plugin-http';
import { readFile } from '@tauri-apps/plugin-fs';

/**
 * Browser-native HTTP Client using fetch.
 */
export class FetchHttpClient implements IHttpClient {
    async execute(req: RadiusRequest, signal?: AbortSignal): Promise<RadiusResponse> {
        const start = performance.now();

        try {
            // 1. Prepare Body (Async)
            const { body, contentType } = await this.prepareBody(req.request.body);

            // 2. Prepare Headers
            const headers: Record<string, string> = {};

            // V2: Support Headers Array
            if (req.request.headers && Array.isArray(req.request.headers)) {
                req.request.headers.forEach(h => {
                    if (h.enabled !== false && h.key) {
                        headers[h.key] = h.value;
                    }
                });
            } else if (req.request.headers) {
                // V1 Fallback
                Object.assign(headers, req.request.headers);
            }

            if (contentType && !headers['Content-Type'] && !headers['content-type']) {
                headers['Content-Type'] = contentType;
            }

            // 3. Execute Fetch
            // Verify plugin availability
            if (typeof fetch !== 'function') {
                throw new Error(`Tauri fetch plugin is not available. Is the backend running?`);
            }

            // Note: Tauri's fetch might not fully support AbortSignal in all versions, 
            // but we pass it anyway as per standard API.
            const fetchOptions: RequestInit = {
                method: req.request.method,
                headers: headers,
                body: body,
                signal: signal
            };

            const res = await fetch(req.request.url, fetchOptions);

            // 4. Process Response
            const responseHeaders: Record<string, string> = {};
            res.headers.forEach((val, key) => {
                responseHeaders[key] = val;
            });

            // Check for binary content
            const responseContentType = (responseHeaders['content-type'] || responseHeaders['Content-Type'] || '').toLowerCase();
            const isBinary = /image\/|audio\/|video\/|pdf|octet-stream/.test(responseContentType);

            let text = '';
            let json = null;

            if (isBinary) {
                // Handle Binary: Convert to Base64 Data URI
                const arrayBuffer = await res.arrayBuffer();
                const base64 = this.arrayBufferToBase64(arrayBuffer);
                text = `data:${responseContentType};base64,${base64}`;
            } else {
                // Handle Text
                text = await res.text();
                try {
                    if (responseContentType.includes('application/json')) {
                        json = JSON.parse(text);
                    }
                } catch {
                    // Ignore parse error
                }
            }

            const end = performance.now();

            return {
                status: res.status,
                statusText: res.statusText,
                headers: responseHeaders,
                body: text,
                json: json,
                timing: {
                    total: Math.round(end - start),
                    ttfb: 0,
                    download: 0
                },
                request: {
                    method: req.request.method,
                    url: req.request.url,
                    headers: headers
                }
            };

        } catch (e) {
            console.error("Fetch Execution Failed:", e);

            // Check for AbortError
            if ((e as Error).name === 'AbortError') {
                return {
                    status: 0,
                    statusText: "Cancelled",
                    headers: {},
                    body: "Request cancelled by user.",
                    json: null,
                    timing: { total: 0 },
                    request: {
                        method: req.request.method,
                        url: req.request.url,
                        headers: {} // Can't easily normalize here without logic duplication, simple empty object is safer for specific AbortError
                    }
                };
            }

            // Format a user-friendly error message
            const errorMessage = e instanceof Error ? e.message : String(e);

            return {
                status: 0,
                statusText: "Network Error",
                headers: {},
                body: `Execution Failed: ${errorMessage}`,
                json: null,
                timing: { total: 0 },
                request: {
                    method: req.request.method,
                    url: req.request.url,
                    headers: {} // Fallback to empty headers on error
                }
            };
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    private async prepareBody(body?: RequestBody): Promise<{ body: BodyInit | undefined, contentType?: string }> {
        if (!body || body.type === 'none') return { body: undefined };

        // V2 Schema Handling
        switch (body.type) {
            case 'binary':
                // Check for file path in content/text
                const filePath = (body as any).content || body.text;
                if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
                    try {
                        // Read file from disk
                        const fileData = await readFile(filePath);
                        return { body: fileData, contentType: 'application/octet-stream' };
                    } catch (e) {
                        throw new Error(`Failed to read binary file at ${filePath}: ${(e as Error).message}`);
                    }
                }
                return { body: undefined };

            case 'json':
                // Use explicit text if available, else stringify content (legacy/object sourced)
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
                    body: body.text || String((body as any).content || ''),
                    contentType: types[body.type] || 'text/plain'
                };
            case 'form-data':
                const formData = new FormData();
                if (body.form && Array.isArray(body.form)) {
                    body.form.forEach(f => {
                        if (f.enabled !== false) formData.append(f.key, f.value);
                    });
                }
                return { body: formData, contentType: undefined }; // fetch adds boundary automatically
            case 'urlencoded':
                const params = new URLSearchParams();
                if (body.form && Array.isArray(body.form)) {
                    body.form.forEach(f => {
                        if (f.enabled !== false) params.append(f.key, f.value);
                    });
                } else if ((body as any).content) {
                    // Legacy support
                    const legacy = (body as any).content;
                    Object.entries(legacy).forEach(([k, v]) => params.append(k, String(v)));
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
                return { body: body.text || '', contentType: 'application/json' };

            // V1 Fallbacks
            default:
                // @ts-ignore
                if (body.format === 'json') return { body: JSON.stringify((body as any).content), contentType: 'application/json' };
                // @ts-ignore
                if (body.format === 'urlencoded') {
                    const params = new URLSearchParams();
                    // @ts-ignore
                    const c = (body as any).content;
                    if (typeof c === 'object' && c !== null) {
                        Object.entries(c).forEach(([key, value]) => {
                            params.append(key, String(value));
                        });
                    }
                    return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' };
                }
                // @ts-ignore
                if (body.format === 'multipart') {
                    const formData = new FormData();
                    // @ts-ignore
                    const c = (body as any).content;
                    if (typeof c === 'object' && c !== null) {
                        Object.entries(c).forEach(([key, value]) => {
                            formData.append(key, value as string | Blob);
                        });
                    }
                    return { body: formData, contentType: undefined };
                }
                // @ts-ignore
                return { body: String((body as any).content), contentType: 'text/plain' };
        }
    }
}
