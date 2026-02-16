/**
 * Variable Resolver for template interpolation.
 * 
 * Resolves {{variable}} placeholders using a priority-based source lookup.
 * Supports recursive resolution for nested variables.
 */

import type { IVariableSource } from '../types.js';

/** Variable pattern: matches {{variableName}} including {{env.VAR}} */
const VARIABLE_PATTERN_STR = '\\{\\{([^}]+)\\}\\}';

/** Built-in variable pattern for special functions like {{$uuid}} */
const BUILTIN_PATTERN = /^\$(\w+)$/;

/**
 * Create a fresh regex for variable matching (avoids lastIndex issues).
 */
function createVariablePattern(): RegExp {
    return new RegExp(VARIABLE_PATTERN_STR, 'g');
}

/**
 * Test if a string contains variable placeholders.
 */
function hasVariables(str: string): boolean {
    return new RegExp(VARIABLE_PATTERN_STR).test(str);
}

/**
 * Options for variable resolution.
 */
export interface ResolverOptions {
    /**
     * If true, throw an error when a variable cannot be resolved.
     * If false, leave the placeholder unchanged.
     * @default true
     */
    strict?: boolean;

    /**
     * Maximum recursion depth for nested variable resolution.
     * @default 10
     */
    maxDepth?: number;
}

/**
 * Result of resolving variables, includes both the resolved string
 * and any unresolved variables found.
 */
export interface ResolveResult {
    /** The resolved string */
    value: string;
    /** List of variable names that could not be resolved */
    unresolved: string[];
}

/**
 * Priority-based variable resolver.
 * 
 * Resolves {{variable}} templates by checking sources in priority order
 * (higher priority sources are checked first).
 */
export class VariableResolver {
    private readonly sources: IVariableSource[];
    private readonly options: Required<ResolverOptions>;

    /**
     * Create a new VariableResolver.
     * @param sources - Variable sources to use (will be sorted by priority)
     * @param options - Resolution options
     */
    constructor(sources: IVariableSource[], options: ResolverOptions = {}) {
        // Sort sources by priority (higher priority first)
        this.sources = [...sources].sort((a, b) => b.priority - a.priority);
        this.options = {
            strict: options.strict ?? true,
            maxDepth: options.maxDepth ?? 10,
        };
    }

    /**
     * Resolve all {{variable}} placeholders in a string.
     * @param template - String containing {{variable}} placeholders
     * @returns Resolved string
     * @throws Error if strict mode and variable not found
     */
    async resolve(template: string): Promise<string> {
        const result = await this.resolveWithInfo(template);

        if (this.options.strict && result.unresolved.length > 0) {
            throw new Error(
                `Unresolved variables: ${result.unresolved.join(', ')}`
            );
        }

        return result.value;
    }

    /**
     * Resolve variables and return detailed result.
     * @param template - String containing {{variable}} placeholders
     * @param depth - Current recursion depth (internal use)
     * @returns Resolve result with value and unresolved list
     */
    async resolveWithInfo(template: string, depth = 0): Promise<ResolveResult> {
        if (depth > this.options.maxDepth) {
            throw new Error(
                `Variable resolution exceeded max depth (${this.options.maxDepth}). ` +
                'Check for circular references.'
            );
        }

        const unresolved: string[] = [];
        let result = template;

        // Find all variable placeholders (use fresh regex)
        const matches = [...template.matchAll(createVariablePattern())];

        for (const match of matches) {
            const fullMatch = match[0];
            const varName = match[1].trim();

            // Check for built-in variables first
            const builtinMatch = varName.match(BUILTIN_PATTERN);
            if (builtinMatch) {
                const builtinValue = this.resolveBuiltin(builtinMatch[1]);
                if (builtinValue !== undefined) {
                    result = result.replace(fullMatch, builtinValue);
                    continue;
                }
            }

            // Look up in sources
            const value = await this.lookup(varName);

            if (value !== undefined) {
                // Check if value contains more variables (recursive resolution)
                if (hasVariables(value)) {
                    const nestedResult = await this.resolveWithInfo(value, depth + 1);
                    result = result.replace(fullMatch, nestedResult.value);
                    unresolved.push(...nestedResult.unresolved);
                } else {
                    result = result.replace(fullMatch, value);
                }
            } else {
                unresolved.push(varName);
            }
        }

        return { value: result, unresolved };
    }

    /**
     * Resolve all variables in an object recursively.
     * Works with nested objects and arrays.
     * @param obj - Object with string values containing variables
     * @returns New object with resolved values
     */
    async resolveObject<T>(obj: T): Promise<T> {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj === 'string') {
            return (await this.resolve(obj)) as T;
        }

        if (Array.isArray(obj)) {
            const resolved = await Promise.all(
                obj.map(item => this.resolveObject(item))
            );
            return resolved as T;
        }

        if (typeof obj === 'object') {
            const resolved: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
                resolved[key] = await this.resolveObject(value);
            }
            return resolved as T;
        }

        // Primitives (number, boolean, etc.) pass through
        return obj;
    }

    /**
     * Look up a variable by name in all sources.
     * @param name - Variable name (e.g., "baseUrl" or "env.API_KEY")
     * @returns Variable value or undefined if not found
     */
    private async lookup(name: string): Promise<string | undefined> {
        // Handle env.VAR_NAME syntax
        const envPrefix = 'env.';
        const lookupName = name.startsWith(envPrefix)
            ? name.slice(envPrefix.length)
            : name;

        // Check sources in priority order
        for (const source of this.sources) {
            const value = await source.get(lookupName);
            if (value !== undefined) {
                return value;
            }
        }

        return undefined;
    }

    /**
     * Resolve built-in variable functions.
     * @param name - Built-in function name (without $)
     * @returns Resolved value or undefined
     */
    private resolveBuiltin(name: string): string | undefined {
        switch (name.toLowerCase()) {
            case 'uuid':
                return this.generateUuid();
            case 'timestamp':
                return Date.now().toString();
            case 'isodate':
                return new Date().toISOString();
            case 'randomint':
                return Math.floor(Math.random() * 1000000).toString();
            default:
                return undefined;
        }
    }

    /**
     * Generate a UUID v4.
     */
    private generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}
