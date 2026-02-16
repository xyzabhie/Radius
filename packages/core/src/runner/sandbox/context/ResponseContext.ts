/**
 * ResponseContext implementation for post-scripts.
 * 
 * Provides the `response` object API available to post-scripts.
 */

import type { ResponseContext, RadiusResponse } from '../../types.js';

/**
 * Implementation of ResponseContext wrapping a RadiusResponse.
 */
export class ResponseContextImpl implements ResponseContext {
    readonly status: number;
    readonly statusText: string;
    readonly headers: Record<string, string>;
    readonly body: string;

    private readonly _json: unknown | null;
    private _jsonParsed = false;

    constructor(response: RadiusResponse) {
        this.status = response.status;
        this.statusText = response.statusText;
        this.headers = { ...response.headers };
        this.body = response.body;
        this._json = response.json;
    }

    json(): unknown {
        if (this._json !== null) {
            return this._json;
        }

        // Try to parse if not already parsed
        if (!this._jsonParsed) {
            this._jsonParsed = true;
            try {
                return JSON.parse(this.body);
            } catch {
                throw new Error('Response body is not valid JSON');
            }
        }

        throw new Error('Response body is not valid JSON');
    }
}
