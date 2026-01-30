/**
 * RadiusContext implementation for script execution.
 * 
 * Provides the `radius` object API available to pre/post scripts.
 */

import type { RadiusContext, ExpectBuilder, ExpectResult } from '../../types.js';

/**
 * Implementation of ExpectBuilder for assertions.
 */
class ExpectBuilderImpl implements ExpectBuilder {
    constructor(private readonly actual: unknown) { }

    toBe(expected: unknown): ExpectResult {
        const passed = Object.is(this.actual, expected);
        return {
            passed,
            message: passed ? 'Values are identical' : `Expected ${this.stringify(expected)}, got ${this.stringify(this.actual)}`,
            expected,
            actual: this.actual,
        };
    }

    toEqual(expected: unknown): ExpectResult {
        const passed = this.deepEqual(this.actual, expected);
        return {
            passed,
            message: passed ? 'Values are deeply equal' : 'Values are not deeply equal',
            expected,
            actual: this.actual,
        };
    }

    toBeTruthy(): ExpectResult {
        const passed = Boolean(this.actual);
        return {
            passed,
            message: passed ? 'Value is truthy' : `Expected truthy, got ${this.stringify(this.actual)}`,
            actual: this.actual,
        };
    }

    toBeFalsy(): ExpectResult {
        const passed = !this.actual;
        return {
            passed,
            message: passed ? 'Value is falsy' : `Expected falsy, got ${this.stringify(this.actual)}`,
            actual: this.actual,
        };
    }

    toBeDefined(): ExpectResult {
        const passed = this.actual !== undefined;
        return {
            passed,
            message: passed ? 'Value is defined' : 'Expected defined value, got undefined',
            actual: this.actual,
        };
    }

    toBeNull(): ExpectResult {
        const passed = this.actual === null;
        return {
            passed,
            message: passed ? 'Value is null' : `Expected null, got ${this.stringify(this.actual)}`,
            actual: this.actual,
        };
    }

    toBeGreaterThan(expected: number): ExpectResult {
        const actual = this.actual as number;
        const passed = typeof actual === 'number' && actual > expected;
        return {
            passed,
            message: passed ? `${actual} > ${expected}` : `Expected ${actual} to be greater than ${expected}`,
            expected,
            actual: this.actual,
        };
    }

    toBeLessThan(expected: number): ExpectResult {
        const actual = this.actual as number;
        const passed = typeof actual === 'number' && actual < expected;
        return {
            passed,
            message: passed ? `${actual} < ${expected}` : `Expected ${actual} to be less than ${expected}`,
            expected,
            actual: this.actual,
        };
    }

    toContain(expected: unknown): ExpectResult {
        let passed = false;
        if (typeof this.actual === 'string' && typeof expected === 'string') {
            passed = this.actual.includes(expected);
        } else if (Array.isArray(this.actual)) {
            passed = this.actual.includes(expected);
        }
        return {
            passed,
            message: passed ? 'Value contains expected' : `Expected ${this.stringify(this.actual)} to contain ${this.stringify(expected)}`,
            expected,
            actual: this.actual,
        };
    }

    toMatch(pattern: RegExp): ExpectResult {
        const passed = typeof this.actual === 'string' && pattern.test(this.actual);
        return {
            passed,
            message: passed ? 'Value matches pattern' : `Expected ${this.stringify(this.actual)} to match ${pattern}`,
            expected: pattern.toString(),
            actual: this.actual,
        };
    }

    private stringify(value: unknown): string {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value}"`;
        return JSON.stringify(value);
    }

    private deepEqual(a: unknown, b: unknown): boolean {
        if (Object.is(a, b)) return true;
        if (typeof a !== typeof b) return false;
        if (a === null || b === null) return false;
        if (typeof a !== 'object') return false;

        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;
        const aKeys = Object.keys(aObj);
        const bKeys = Object.keys(bObj);

        if (aKeys.length !== bKeys.length) return false;

        return aKeys.every(key => this.deepEqual(aObj[key], bObj[key]));
    }
}

/**
 * Implementation of RadiusContext for script execution.
 */
export class RadiusContextImpl implements RadiusContext {
    private readonly variables = new Map<string, unknown>();
    private readonly envVars: Record<string, string | undefined>;

    /** Captured log messages */
    public readonly logs: string[] = [];

    /** Collected assertion results */
    public readonly assertions: ExpectResult[] = [];

    constructor(envVars: Record<string, string | undefined> = process.env) {
        this.envVars = envVars;
    }

    getVariable(name: string): unknown {
        return this.variables.get(name);
    }

    setVariable(name: string, value: unknown): void {
        this.variables.set(name, value);
    }

    getEnv(name: string): string | undefined {
        return this.envVars[name];
    }

    uuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    timestamp(): number {
        return Date.now();
    }

    log(...args: unknown[]): void {
        this.logs.push(args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' '));
    }

    expect(actual: unknown): ExpectBuilder {
        const builder = new ExpectBuilderImpl(actual);

        // Wrap methods to capture results
        const self = this;
        const originalMethods = ['toBe', 'toEqual', 'toBeTruthy', 'toBeFalsy', 'toBeDefined', 'toBeNull', 'toBeGreaterThan', 'toBeLessThan', 'toContain', 'toMatch'] as const;

        const wrappedBuilder: ExpectBuilder = {} as ExpectBuilder;
        for (const method of originalMethods) {
            (wrappedBuilder as any)[method] = (...args: any[]) => {
                const result = (builder as any)[method](...args);
                self.assertions.push(result);
                return result;
            };
        }

        return wrappedBuilder;
    }

    /**
     * Get all variables as a plain object.
     */
    getVariables(): Record<string, unknown> {
        return Object.fromEntries(this.variables);
    }

    /**
     * Set multiple variables at once.
     */
    setVariables(vars: Record<string, unknown>): void {
        for (const [key, value] of Object.entries(vars)) {
            this.variables.set(key, value);
        }
    }
}
