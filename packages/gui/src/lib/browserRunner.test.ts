import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browserRequestRunner } from './browserRunner';
import { RadiusRequest } from '@radius/core';

// Mock global fetch
global.fetch = vi.fn();

describe('browserRequestRunner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('executes a simple GET request', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            text: async () => '{"message": "success"}',
            headers: new Headers({ 'content-type': 'application/json' }),
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const request: RadiusRequest = {
            meta: { name: 'Test', type: 'REST', version: 2 },
            request: { method: 'GET', url: 'https://api.test/get', headers: [] }
        };

        const result = await browserRequestRunner.execute(request);

        expect(global.fetch).toHaveBeenCalledWith('https://api.test/get', expect.objectContaining({
            method: 'GET'
        }));
        expect(result.status).toBe(200);
        expect(result.json).toEqual({ message: 'success' });
    });

    it('serializes JSON body correctly (V2)', async () => {
        (global.fetch as any).mockResolvedValue({
            status: 201,
            text: async () => '',
            headers: new Headers()
        });

        const request: RadiusRequest = {
            meta: { name: 'Test', type: 'REST', version: 2 },
            request: {
                method: 'POST',
                url: 'https://api.test/post',
                headers: [],
                body: { type: 'json', text: '{"foo":"bar"}' }
            }
        };

        await browserRequestRunner.execute(request);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: '{"foo":"bar"}',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json'
                })
            })
        );
    });

    it('serializes JSON body correctly (V1 Fallback)', async () => {
        (global.fetch as any).mockResolvedValue({
            status: 201,
            text: async () => '',
            headers: new Headers()
        });

        // Use 'any' to bypass V2 strict typing if needed for test valid V1
        const request: any = {
            meta: { name: 'Test', type: 'REST', version: 1 },
            request: {
                method: 'POST',
                url: 'https://api.test/post',
                headers: {},
                body: { format: 'json', content: { foo: 'bar' } }
            }
        };

        await browserRequestRunner.execute(request);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: '{"foo":"bar"}',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json'
                })
            })
        );
    });

    it('handles network errors gracefully', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Network Error'));

        const request: RadiusRequest = {
            meta: { name: 'Test', type: 'REST', version: 2 },
            request: { method: 'GET', url: 'https://api.test/fail', headers: [] }
        };

        const result = await browserRequestRunner.execute(request);

        expect(result.status).toBe(0);
        expect(result.statusText).toBe('Network Error');
        expect(result.body).toBe('Network Error');
    });
});
