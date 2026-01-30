/**
 * Core type definitions for the Radius Request Runner Engine.
 * 
 * This module defines the data contracts for:
 * - Request definitions (.rd file structure)
 * - Response objects
 * - Script execution contexts
 * - Variable resolution sources
 */

// =============================================================================
// HTTP Types
// =============================================================================

/** Supported HTTP methods */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

/** Request body format types */
export type BodyFormat = 'json' | 'form' | 'multipart' | 'raw' | 'graphql';

/** Authentication types */
export type AuthType = 'none' | 'inherit' | 'bearer' | 'basic' | 'api-key';

/** API key placement */
export type ApiKeyPlacement = 'header' | 'query';

/** Request type */
export type RequestType = 'REST' | 'GraphQL';

// =============================================================================
// RadiusRequest - Parsed from .rd files
// =============================================================================

/**
 * Metadata section of a .rd file.
 */
export interface RequestMeta {
    /** Human-readable name for the request */
    name: string;
    /** Type of API request */
    type: RequestType;
    /** Schema version for migration support */
    version: number;
}

/**
 * Request body configuration.
 */
export interface RequestBody {
    /** Body content format */
    format: BodyFormat;
    /** Body content (structure depends on format) */
    content?: unknown;
    /** GraphQL query string (used when format is graphql) */
    query?: string;
    /** GraphQL variables (used when format is graphql) */
    variables?: Record<string, unknown>;
}

/**
 * Authentication configuration.
 */
export interface AuthConfig {
    /** Authentication type */
    type: AuthType;
    /** Bearer token (use {{env.VAR}} reference) */
    token?: string;
    /** Basic auth username */
    username?: string;
    /** Basic auth password */
    password?: string;
    /** API key header/query param name */
    key?: string;
    /** API key value */
    value?: string;
    /** Where to send the API key */
    in?: ApiKeyPlacement;
}

/**
 * Script configuration for pre/post request execution.
 */
export interface ScriptConfig {
    /** Script language (defaults to javascript) */
    language?: string;
    /** Script to run before the request */
    pre?: string;
    /** Script to run after the response */
    post?: string;
}

/**
 * Core request definition section.
 */
export interface RequestDefinition {
    /** HTTP method */
    method: HttpMethod;
    /** Request URL with optional {{variable}} placeholders */
    url: string;
    /** URL query parameters */
    query?: Record<string, string>;
    /** HTTP headers */
    headers?: Record<string, string>;
    /** Request body configuration */
    body?: RequestBody;
}

/**
 * Complete structure of a parsed .rd file.
 */
export interface RadiusRequest {
    /** Request metadata */
    meta: RequestMeta;
    /** Core request definition */
    request: RequestDefinition;
    /** Authentication configuration */
    auth?: AuthConfig;
    /** Pre/post scripts */
    scripts?: ScriptConfig;
}

// =============================================================================
// RadiusResponse - Returned by the runner
// =============================================================================

/**
 * Request timing metrics.
 */
export interface RequestTiming {
    /** Total request duration in milliseconds */
    total: number;
    /** DNS lookup time in milliseconds */
    dns?: number;
    /** TCP connection time in milliseconds */
    connect?: number;
    /** TLS handshake time in milliseconds */
    tls?: number;
    /** Time to first byte in milliseconds */
    ttfb?: number;
    /** Content download time in milliseconds */
    download?: number;
}

/**
 * Request metadata included in response for debugging.
 */
export interface RequestInfo {
    /** HTTP method used */
    method: string;
    /** Final resolved URL */
    url: string;
    /** Headers sent with request */
    headers: Record<string, string>;
}

/**
 * Standardized response object returned by the Request Runner.
 */
export interface RadiusResponse {
    /** HTTP status code */
    status: number;
    /** HTTP status text (e.g., "OK", "Not Found") */
    statusText: string;
    /** Response headers as key-value pairs */
    headers: Record<string, string>;
    /** Raw response body as string */
    body: string;
    /** Parsed JSON body (null if not JSON) */
    json: unknown | null;
    /** Request timing metrics */
    timing: RequestTiming;
    /** Request metadata for debugging */
    request: RequestInfo;
}

// =============================================================================
// Script Execution Contexts
// =============================================================================

/**
 * Expectation result from radius.expect() assertions.
 */
export interface ExpectResult {
    /** Whether the assertion passed */
    passed: boolean;
    /** Description of the assertion */
    message: string;
    /** Expected value */
    expected?: unknown;
    /** Actual value */
    actual?: unknown;
}

/**
 * Context object available to scripts via the `radius` global.
 * Provides utilities for variable management and assertions.
 */
export interface RadiusContext {
    /** Get a variable value */
    getVariable(name: string): unknown;

    /** Set a variable value for use in subsequent requests */
    setVariable(name: string, value: unknown): void;

    /** Get an environment variable */
    getEnv(name: string): string | undefined;

    /** Generate a UUID v4 */
    uuid(): string;

    /** Get current Unix timestamp in milliseconds */
    timestamp(): number;

    /** Log messages (captured for display) */
    log(...args: unknown[]): void;

    /**
     * Simple assertion method for script-based testing.
     * @param actual - The actual value
     * @returns An expectation builder with assertion methods
     */
    expect(actual: unknown): ExpectBuilder;
}

/**
 * Fluent builder for assertions.
 */
export interface ExpectBuilder {
    /** Assert equality */
    toBe(expected: unknown): ExpectResult;
    /** Assert deep equality for objects/arrays */
    toEqual(expected: unknown): ExpectResult;
    /** Assert truthiness */
    toBeTruthy(): ExpectResult;
    /** Assert falsiness */
    toBeFalsy(): ExpectResult;
    /** Assert value is defined (not undefined) */
    toBeDefined(): ExpectResult;
    /** Assert value is null */
    toBeNull(): ExpectResult;
    /** Assert value is greater than */
    toBeGreaterThan(expected: number): ExpectResult;
    /** Assert value is less than */
    toBeLessThan(expected: number): ExpectResult;
    /** Assert string/array contains value */
    toContain(expected: unknown): ExpectResult;
    /** Assert string matches regex */
    toMatch(pattern: RegExp): ExpectResult;
}

/**
 * Response object available to post-scripts.
 */
export interface ResponseContext {
    /** HTTP status code */
    status: number;
    /** HTTP status text */
    statusText: string;
    /** Response headers */
    headers: Record<string, string>;
    /** Raw response body as string */
    body: string;
    /** Parse body as JSON (throws if invalid) */
    json(): unknown;
}

// =============================================================================
// Variable Resolution
// =============================================================================

/**
 * Abstract interface for variable sources.
 * Implementations can read from different backends (env files, keychains, etc.)
 */
export interface IVariableSource {
    /** Source name for debugging */
    readonly name: string;
    /** Priority (higher = checked first) */
    readonly priority: number;
    /** Get a variable value by key */
    get(key: string): Promise<string | undefined>;
}

/**
 * Abstract interface for secret storage backends.
 * Implementations should use secure storage (OS Keychain, Vault, etc.)
 */
export interface ISecretSource {
    /** Source name for debugging */
    readonly name: string;
    /** Get a secret value by key */
    get(key: string): Promise<string | undefined>;
    /** Set a secret value (optional, for write-capable backends) */
    set?(key: string, value: string): Promise<void>;
    /** Delete a secret (optional) */
    delete?(key: string): Promise<void>;
}

// =============================================================================
// Runner Configuration
// =============================================================================

/**
 * Configuration options for the Request Runner.
 */
export interface RunnerOptions {
    /** Base path for project (used for .gv files) */
    projectRoot?: string;
    /** Path to .env file */
    envPath?: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Script execution timeout in milliseconds (default: 5000) */
    scriptTimeout?: number;
    /** Additional variable sources */
    variableSources?: IVariableSource[];
    /** Secret source implementation */
    secretSource?: ISecretSource;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validation error details.
 */
export interface ValidationError {
    /** JSON path to the error location */
    path: string;
    /** Error message */
    message: string;
    /** JSON Schema keyword that failed */
    keyword?: string;
}

/**
 * Result of validating a .rd file.
 */
export interface ValidationResult {
    /** Whether validation passed */
    valid: boolean;
    /** List of validation errors (empty if valid) */
    errors: ValidationError[];
}

// =============================================================================
// Resolved Request (After variable interpolation)
// =============================================================================

/**
 * A fully resolved request ready for execution.
 * All {{variable}} placeholders have been replaced.
 */
export interface ResolvedRequest {
    /** HTTP method */
    method: HttpMethod;
    /** Fully resolved URL */
    url: string;
    /** Resolved headers */
    headers: Record<string, string>;
    /** Resolved body (serialized) */
    body?: string | FormData;
    /** Original request for reference */
    original: RadiusRequest;
}
