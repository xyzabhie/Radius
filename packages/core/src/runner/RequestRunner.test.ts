/**
 * Integration tests for RequestRunner.
 * 
 * Tests the full execution flow:
 * - Variable resolution
 * - Pre/post script execution
 * - HTTP request execution (mocked)
 * - Timing metrics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptSandbox } from './sandbox/ScriptSandbox.js';
import { VariableResolver } from './resolver/VariableResolver.js';
import { HttpClient } from './client/HttpClient.js';
import type { RadiusRequest, RadiusResponse, IVariableSource } from './types.js';

/**
 * Mock HttpClient for testing without network requests.
 */
class MockHttpClient {
    async execute(request: RadiusRequest): Promise<RadiusResponse> {
        const body = request.request.body?.content as Record<string, unknown> | undefined;

        return {
            status: 200,
            statusText: 'OK',
            headers: {
                'content-type': 'application/json',
                'x-request-id': '12345',
            },
            body: JSON.stringify({
                id: 1,
                username: body?.username || 'testuser',
                email: body?.email || 'test@example.com',
                created: true,
            }),
            json: {
                id: 1,
                username: body?.username || 'testuser',
                email: body?.email || 'test@example.com',
                created: true,
            },
            timing: {
                total: 150,
                ttfb: 100,
                download: 50,
            },
            request: {
                method: request.request.method,
                url: request.request.url,
                headers: request.request.headers || {},
            },
        };
    }
}

/**
 * Mock variable source for testing.
 */
class MockVariableSource implements IVariableSource {
    readonly name = 'MockSource';
    readonly priority = 100;
    private values: Record<string, string>;

    constructor(values: Record<string, string>) {
        this.values = values;
    }

    async get(key: string): Promise<string | undefined> {
        return this.values[key];
    }
}

/**
 * Integration test runner that mimics RequestRunner behavior.
 */
async function executeWithMock(
    request: RadiusRequest,
    variables: Record<string, string> = {}
): Promise<{ response: RadiusResponse; sandbox: ScriptSandbox }> {
    const sandbox = new ScriptSandbox({ timeout: 5000 });
    const client = new MockHttpClient();
    const source = new MockVariableSource(variables);
    const resolver = new VariableResolver([source], { strict: false });

    // 1. Resolve variables
    const resolved = await resolver.resolveObject(request);

    // 2. Run pre-script if present
    if (resolved.scripts?.pre) {
        await sandbox.runPre(resolved.scripts.pre);
    }

    // 3. Execute HTTP request
    const response = await client.execute(resolved);

    // 4. Run post-script if present
    if (resolved.scripts?.post) {
        const postResult = await sandbox.runPost(resolved.scripts.post, response);
        if (postResult.logs.length > 0) {
            (response as any)._scriptLogs = postResult.logs;
        }
        if (postResult.assertions.length > 0) {
            (response as any)._assertions = postResult.assertions;
        }
    }

    return { response, sandbox };
}

describe('RequestRunner Integration', () => {
    describe('execute', () => {
        it('should execute a simple GET request', async () => {
            const request: RadiusRequest = {
                meta: {
                    name: 'Test GET',
                    type: 'REST',
                    version: 1,
                },
                request: {
                    method: 'GET',
                    url: 'https://api.example.com/health',
                },
                auth: {
                    type: 'none',
                },
            };

            const { response } = await executeWithMock(request);

            expect(response.status).toBe(200);
            expect(response.statusText).toBe('OK');
            expect(response.timing).toBeDefined();
            expect(response.timing.total).toBeGreaterThan(0);
        });

        it('should resolve variables in request', async () => {
            const request: RadiusRequest = {
                meta: {
                    name: 'Test with Variables',
                    type: 'REST',
                    version: 1,
                },
                request: {
                    method: 'POST',
                    url: '{{apiUrl}}/users',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        format: 'json',
                        content: {
                            username: 'johndoe',
                            email: 'john@example.com',
                        },
                    },
                },
                auth: {
                    type: 'bearer',
                    token: '{{authToken}}',
                },
            };

            const { response } = await executeWithMock(request, {
                apiUrl: 'https://api.example.com',
                authToken: 'test-bearer-token',
            });

            expect(response.status).toBe(200);
            expect(response.json).toBeDefined();
            expect((response.json as any).username).toBe('johndoe');
            // Verify the URL was resolved
            expect(response.request.url).toBe('https://api.example.com/users');
        });

        it('should capture timing metrics', async () => {
            const request: RadiusRequest = {
                meta: {
                    name: 'Timing Test',
                    type: 'REST',
                    version: 1,
                },
                request: {
                    method: 'GET',
                    url: 'https://api.example.com/data',
                },
            };

            const { response } = await executeWithMock(request);

            expect(response.timing).toBeDefined();
            expect(response.timing.total).toBe(150);
            expect(response.timing.ttfb).toBe(100);
            expect(response.timing.download).toBe(50);
        });

        it('should execute post-script with response access', async () => {
            const request: RadiusRequest = {
                meta: {
                    name: 'Post-Script Test',
                    type: 'REST',
                    version: 1,
                },
                request: {
                    method: 'GET',
                    url: 'https://api.example.com/users',
                },
                scripts: {
                    post: `
            // Assert status code
            radius.expect(response.status).toBe(200);
            
            // Parse response and store data
            const data = response.json();
            radius.setVariable('userId', data.id);
            radius.log('User ID:', data.id);
          `,
                },
            };

            const { response } = await executeWithMock(request);

            expect(response.status).toBe(200);

            // Check that assertions were captured
            const assertions = (response as any)._assertions;
            expect(assertions).toBeDefined();
            expect(assertions.length).toBeGreaterThan(0);
            expect(assertions[0].passed).toBe(true);

            // Check that logs were captured
            const logs = (response as any)._scriptLogs;
            expect(logs).toBeDefined();
            expect(logs.some((log: string) => log.includes('User ID:'))).toBe(true);
        });

        it('should execute pre-script to set variables', async () => {
            const request: RadiusRequest = {
                meta: {
                    name: 'Pre-Script Test',
                    type: 'REST',
                    version: 1,
                },
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/users',
                    body: {
                        format: 'json',
                        content: {
                            username: 'testuser',
                        },
                    },
                },
                scripts: {
                    pre: `
            // Generate a unique ID
            const requestId = radius.uuid();
            radius.setVariable('requestId', requestId);
            radius.log('Generated request ID:', requestId);
          `,
                },
            };

            const { response, sandbox } = await executeWithMock(request);

            expect(response.status).toBe(200);

            // Verify pre-script executed
            const context = sandbox.getContext();
            const requestId = context.getVariable('requestId');
            expect(requestId).toBeDefined();
            expect(typeof requestId).toBe('string');
        });
    });
});

describe('ScriptSandbox Security', () => {
    it('should block access to process', async () => {
        const sandbox = new ScriptSandbox({ timeout: 1000 });

        const result = await sandbox.runPre(`
      try {
        const env = process.env;
        radius.setVariable('leaked', true);
      } catch (e) {
        radius.setVariable('blocked', true);
      }
    `);

        expect(result.variables.leaked).toBeUndefined();
        expect(result.variables.blocked).toBe(true);
    });

    it('should block access to require', async () => {
        const sandbox = new ScriptSandbox({ timeout: 1000 });

        const result = await sandbox.runPre(`
      try {
        const fs = require('fs');
        radius.setVariable('leaked', true);
      } catch (e) {
        radius.setVariable('blocked', true);
      }
    `);

        expect(result.variables.leaked).toBeUndefined();
        expect(result.variables.blocked).toBe(true);
    });

    it('should timeout long-running scripts', async () => {
        const sandbox = new ScriptSandbox({ timeout: 100 });

        const result = await sandbox.runPre(`
      while(true) {} // Infinite loop
    `);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('should allow safe operations', async () => {
        const sandbox = new ScriptSandbox({ timeout: 1000 });

        const result = await sandbox.runPre(`
      const data = { name: 'test', values: [1, 2, 3] };
      const sum = data.values.reduce((a, b) => a + b, 0);
      radius.setVariable('sum', sum);
      radius.setVariable('json', JSON.stringify(data));
    `);

        expect(result.success).toBe(true);
        expect(result.variables.sum).toBe(6);
        expect(result.variables.json).toBe('{"name":"test","values":[1,2,3]}');
    });

    it('should support radius.expect() assertions', async () => {
        const sandbox = new ScriptSandbox({ timeout: 1000 });

        const mockResponse: RadiusResponse = {
            status: 201,
            statusText: 'Created',
            headers: {},
            body: '{"id": 1}',
            json: { id: 1 },
            timing: { total: 100 },
            request: { method: 'POST', url: 'https://example.com', headers: {} },
        };

        const result = await sandbox.runPost(`
      radius.expect(response.status).toBe(201);
      radius.expect(response.json().id).toBe(1);
      radius.expect(response.status).toBeGreaterThan(200);
    `, mockResponse);

        expect(result.success).toBe(true);
        expect(result.assertions.length).toBe(3);
        expect(result.assertions.every(a => a.passed)).toBe(true);
    });
});
