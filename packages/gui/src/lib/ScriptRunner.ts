import { RequestData, TestResult } from '../components/request/types';
import { RadiusResponse } from '@radius/core';

/**
 * Isolated execution environment for Radius scripts.
 * Design Principle: Deterministic execution with a controlled API surface.
 */
export class ScriptRunner {
    private testResults: TestResult[] = [];

    /**
     * Executes a script with the provided context.
     * Uses the Function constructor for basic sandboxing in the browser.
     */
    private async execute(script: string, context: any) {
        try {
            const keys = Object.keys(context);
            const values = Object.values(context);
            const fn = new Function(...keys, script);
            await fn(...values);
        } catch (error) {
            console.error('Script Execution Error:', error);
            throw error;
        }
    }

    /**
     * Pre-request script execution.
     * Can modify request URL, headers, and params.
     */
    async runPreRequest(request: RequestData, variables: Record<string, string>): Promise<{
        updates: Partial<RequestData>,
        variableUpdates: Record<string, string>
    }> {
        const variableUpdates: Record<string, string> = { ...variables };
        const updates: Partial<RequestData> = {
            headers: [...request.headers],
            params: [...request.params],
            url: request.url
        };

        const rd = {
            request: {
                get url() { return updates.url; },
                set url(v) { updates.url = v; },
                headers: {
                    set: (key: string, value: string) => {
                        const idx = updates.headers!.findIndex(h => h.key.toLowerCase() === key.toLowerCase());
                        if (idx > -1) updates.headers![idx] = { ...updates.headers![idx], value, enabled: true };
                        else updates.headers!.push({ id: Math.random().toString(), key, value, enabled: true });
                    },
                    get: (key: string) => updates.headers!.find(h => h.key.toLowerCase() === key.toLowerCase())?.value
                },
                params: {
                    set: (key: string, value: string) => {
                        const idx = updates.params!.findIndex(p => p.key.toLowerCase() === key.toLowerCase());
                        if (idx > -1) updates.params![idx] = { ...updates.params![idx], value, enabled: true };
                        else updates.params!.push({ id: Math.random().toString(), key, value, enabled: true });
                    }
                }
            },
            variables: {
                get: (key: string) => variableUpdates[key],
                set: (key: string, value: string) => { variableUpdates[key] = value; }
            }
        };

        if (request.preRequestScript) {
            await this.execute(request.preRequestScript, { rd });
        }

        return { updates, variableUpdates };
    }

    /**
     * Post-request script execution.
     * Handles assertions and test results.
     */
    async runPostRequest(request: RequestData, response: RadiusResponse, variables: Record<string, string>): Promise<{
        testResults: TestResult[],
        variableUpdates: Record<string, string>
    }> {
        this.testResults = [];
        const variableUpdates = { ...variables };

        const rd = {
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: response.body,
                json: response.json,
                time: response.timing.total
            },
            variables: {
                get: (key: string) => variableUpdates[key],
                set: (key: string, value: string) => { variableUpdates[key] = value; }
            },
            test: (name: string, fn: () => void) => {
                const currentTest: TestResult = { name, passed: true, assertions: [] };
                this.testResults.push(currentTest);

                try {
                    fn();
                } catch (error) {
                    currentTest.passed = false;
                    currentTest.assertions.push({
                        message: 'Test failed with error',
                        passed: false,
                        error: (error as Error).message
                    });
                }
            },
            expect: (value: any) => ({
                toBe: (expected: any) => {
                    const passed = value === expected;
                    const lastTest = this.testResults[this.testResults.length - 1];
                    if (lastTest) {
                        lastTest.assertions.push({
                            message: `Expected ${value} to be ${expected}`,
                            passed
                        });
                        if (!passed) lastTest.passed = false;
                    }
                },
                toContain: (expected: string) => {
                    const passed = String(value).includes(expected);
                    const lastTest = this.testResults[this.testResults.length - 1];
                    if (lastTest) {
                        lastTest.assertions.push({
                            message: `Expected ${value} to contain ${expected}`,
                            passed
                        });
                        if (!passed) lastTest.passed = false;
                    }
                }
            })
        };

        if (request.testScript) {
            // POSTMAN COMPATIBILITY LAYER
            const postmanContext: any = {
                rd,
                responseBody: response.body || '',
                responseCode: { code: response.status },
                postman: {
                    setEnvironmentVariable: rd.variables.set,
                    getEnvironmentVariable: rd.variables.get,
                    setGlobalVariable: rd.variables.set,
                    getGlobalVariable: rd.variables.get
                },
                pm: {
                    ...rd,
                    response: {
                        ...rd.response,
                        json: () => response.json || {}
                    },
                    environment: {
                        set: rd.variables.set,
                        get: rd.variables.get
                    },
                    globals: {
                        set: rd.variables.set,
                        get: rd.variables.get
                    }
                },
                // OVERRIDE JSON.parse for safety with responseBody
                JSON: {
                    ...JSON,
                    parse: (str: string) => {
                        if (typeof str !== 'string' || str.trim() === '') return {};
                        try {
                            return JSON.parse(str);
                        } catch (e) {
                            console.warn("Postman Compatibility: Safe JSON.parse failed, returning {}", e);
                            return {};
                        }
                    }
                }
            };
            await this.execute(request.testScript, postmanContext);
        }

        return {
            testResults: this.testResults,
            variableUpdates
        };
    }
}
