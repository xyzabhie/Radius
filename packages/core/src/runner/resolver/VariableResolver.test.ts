/**
 * Unit tests for VariableResolver.
 * 
 * Tests cover:
 * - Basic variable resolution
 * - Priority order (higher priority sources first)
 * - Recursive/nested variable resolution
 * - Built-in variables ($uuid, $timestamp, etc.)
 * - Strict mode error handling
 * - Object resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VariableResolver } from './VariableResolver.js';
import { SystemEnvSource } from './sources/SystemEnvSource.js';
import type { IVariableSource } from '../types.js';

/**
 * Mock variable source for testing.
 */
class MockSource implements IVariableSource {
    constructor(
        public readonly name: string,
        public readonly priority: number,
        private readonly values: Record<string, string>
    ) { }

    async get(key: string): Promise<string | undefined> {
        return this.values[key];
    }
}

describe('VariableResolver', () => {
    describe('Basic Resolution', () => {
        it('should resolve a simple variable', async () => {
            const source = new MockSource('test', 100, { baseUrl: 'https://api.example.com' });
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('{{baseUrl}}/users');
            expect(result).toBe('https://api.example.com/users');
        });

        it('should resolve multiple variables', async () => {
            const source = new MockSource('test', 100, {
                protocol: 'https',
                host: 'api.example.com',
            });
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('{{protocol}}://{{host}}/api');
            expect(result).toBe('https://api.example.com/api');
        });

        it('should handle variables with spaces in braces', async () => {
            const source = new MockSource('test', 100, { myVar: 'value' });
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('{{ myVar }}');
            expect(result).toBe('value');
        });

        it('should handle env.VAR_NAME syntax', async () => {
            const source = new MockSource('test', 100, { API_KEY: 'secret123' });
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('Bearer {{env.API_KEY}}');
            expect(result).toBe('Bearer secret123');
        });
    });

    describe('Priority Order', () => {
        it('should use higher priority source first', async () => {
            const lowPriority = new MockSource('low', 100, { value: 'from-low' });
            const highPriority = new MockSource('high', 200, { value: 'from-high' });

            // Order in constructor doesn't matter - priority does
            const resolver = new VariableResolver([lowPriority, highPriority]);

            const result = await resolver.resolve('{{value}}');
            expect(result).toBe('from-high');
        });

        it('should fallback to lower priority if not found in higher', async () => {
            const lowPriority = new MockSource('low', 100, {
                fallback: 'from-low',
                shared: 'low-shared'
            });
            const highPriority = new MockSource('high', 200, {
                shared: 'high-shared'
            });

            const resolver = new VariableResolver([lowPriority, highPriority]);

            expect(await resolver.resolve('{{fallback}}')).toBe('from-low');
            expect(await resolver.resolve('{{shared}}')).toBe('high-shared');
        });

        it('should work with three priority levels', async () => {
            const low = new MockSource('low', 100, { a: 'low-a', b: 'low-b', c: 'low-c' });
            const mid = new MockSource('mid', 200, { a: 'mid-a', b: 'mid-b' });
            const high = new MockSource('high', 300, { a: 'high-a' });

            const resolver = new VariableResolver([mid, low, high]); // Random order

            expect(await resolver.resolve('{{a}}')).toBe('high-a');
            expect(await resolver.resolve('{{b}}')).toBe('mid-b');
            expect(await resolver.resolve('{{c}}')).toBe('low-c');
        });
    });

    describe('Recursive Resolution', () => {
        it('should resolve nested variables', async () => {
            const source = new MockSource('test', 100, {
                protocol: 'https',
                host: 'api.example.com',
                baseUrl: '{{protocol}}://{{host}}',
            });
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('{{baseUrl}}/users');
            expect(result).toBe('https://api.example.com/users');
        });

        it('should resolve deeply nested variables', async () => {
            const source = new MockSource('test', 100, {
                a: 'value',
                b: '{{a}}',
                c: '{{b}}',
                d: '{{c}}',
            });
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('{{d}}');
            expect(result).toBe('value');
        });

        it('should throw on max depth exceeded', async () => {
            const source = new MockSource('test', 100, {
                a: '{{b}}',
                b: '{{a}}', // Circular reference
            });
            const resolver = new VariableResolver([source], { maxDepth: 5 });

            await expect(resolver.resolve('{{a}}')).rejects.toThrow(
                'exceeded max depth'
            );
        });
    });

    describe('Built-in Variables', () => {
        it('should resolve $uuid', async () => {
            const resolver = new VariableResolver([]);

            const result = await resolver.resolve('{{$uuid}}');
            expect(result).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            );
        });

        it('should resolve $timestamp', async () => {
            const resolver = new VariableResolver([]);
            const before = Date.now();

            const result = await resolver.resolve('{{$timestamp}}');
            const after = Date.now();

            const timestamp = parseInt(result, 10);
            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });

        it('should resolve $isodate', async () => {
            const resolver = new VariableResolver([]);

            const result = await resolver.resolve('{{$isodate}}');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should resolve $randomInt', async () => {
            const resolver = new VariableResolver([]);

            const result = await resolver.resolve('{{$randomInt}}');
            const num = parseInt(result, 10);
            expect(num).toBeGreaterThanOrEqual(0);
            expect(num).toBeLessThan(1000000);
        });
    });

    describe('Strict Mode', () => {
        it('should throw in strict mode when variable not found', async () => {
            const resolver = new VariableResolver([], { strict: true });

            await expect(resolver.resolve('{{unknown}}')).rejects.toThrow(
                'Unresolved variables: unknown'
            );
        });

        it('should leave placeholder in non-strict mode', async () => {
            const resolver = new VariableResolver([], { strict: false });

            const result = await resolver.resolve('prefix-{{unknown}}-suffix');
            expect(result).toBe('prefix-{{unknown}}-suffix');
        });

        it('should report multiple unresolved variables', async () => {
            const resolver = new VariableResolver([], { strict: true });

            await expect(
                resolver.resolve('{{a}} and {{b}} and {{c}}')
            ).rejects.toThrow('Unresolved variables: a, b, c');
        });
    });

    describe('resolveWithInfo', () => {
        it('should return unresolved variables list', async () => {
            const source = new MockSource('test', 100, { found: 'yes' });
            const resolver = new VariableResolver([source], { strict: false });

            const result = await resolver.resolveWithInfo('{{found}} {{notFound}}');

            expect(result.value).toBe('yes {{notFound}}');
            expect(result.unresolved).toEqual(['notFound']);
        });
    });

    describe('resolveObject', () => {
        it('should resolve variables in object values', async () => {
            const source = new MockSource('test', 100, {
                url: 'https://api.example.com',
                token: 'abc123',
            });
            const resolver = new VariableResolver([source]);

            const obj = {
                endpoint: '{{url}}/users',
                auth: 'Bearer {{token}}',
            };

            const result = await resolver.resolveObject(obj);

            expect(result).toEqual({
                endpoint: 'https://api.example.com/users',
                auth: 'Bearer abc123',
            });
        });

        it('should resolve nested objects', async () => {
            const source = new MockSource('test', 100, { value: 'resolved' });
            const resolver = new VariableResolver([source]);

            const obj = {
                level1: {
                    level2: {
                        prop: '{{value}}',
                    },
                },
            };

            const result = await resolver.resolveObject(obj);

            expect(result.level1.level2.prop).toBe('resolved');
        });

        it('should resolve arrays', async () => {
            const source = new MockSource('test', 100, { a: 'A', b: 'B' });
            const resolver = new VariableResolver([source]);

            const arr = ['{{a}}', '{{b}}', 'literal'];
            const result = await resolver.resolveObject(arr);

            expect(result).toEqual(['A', 'B', 'literal']);
        });

        it('should pass through primitives', async () => {
            const resolver = new VariableResolver([]);

            expect(await resolver.resolveObject(42)).toBe(42);
            expect(await resolver.resolveObject(true)).toBe(true);
            expect(await resolver.resolveObject(null)).toBe(null);
            expect(await resolver.resolveObject(undefined)).toBe(undefined);
        });
    });

    describe('SystemEnvSource Integration', () => {
        it('should read from process.env', async () => {
            // Set a test env var
            process.env.TEST_RADIUS_VAR = 'test-value';

            const source = new SystemEnvSource(100);
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('{{TEST_RADIUS_VAR}}');
            expect(result).toBe('test-value');

            // Cleanup
            delete process.env.TEST_RADIUS_VAR;
        });

        it('should work with env.VAR syntax for system vars', async () => {
            process.env.TEST_RADIUS_API_KEY = 'my-secret-key';

            const source = new SystemEnvSource(100);
            const resolver = new VariableResolver([source]);

            const result = await resolver.resolve('Bearer {{env.TEST_RADIUS_API_KEY}}');
            expect(result).toBe('Bearer my-secret-key');

            delete process.env.TEST_RADIUS_API_KEY;
        });
    });
});
