/**
 * Radius Request Runner - Public API
 * 
 * This module exports all public types and classes for the runner engine.
 */

// Core types
export type {
    HttpMethod,
    BodyFormat,
    AuthType,
    ApiKeyPlacement,
    RequestType,
    RequestMeta,
    RequestBody,
    AuthConfig,
    ScriptConfig,
    RequestDefinition,
    RadiusRequest,
    RequestTiming,
    RequestInfo,
    RadiusResponse,
    ExpectResult,
    RadiusContext,
    ExpectBuilder,
    ResponseContext,
    IVariableSource,
    ISecretSource,
    RunnerOptions,
    ValidationError,
    ValidationResult,
    ResolvedRequest,
    KeyValueEntry,
    FormDataEntry,
} from './types.js';

// Parser
export { YamlParser } from './parser/YamlParser.js';

// Resolver
export { VariableResolver, type ResolverOptions, type ResolveResult } from './resolver/VariableResolver.js';
export { SystemEnvSource } from './resolver/sources/SystemEnvSource.js';
export { DotEnvSource, type DotEnvSourceOptions } from './resolver/sources/DotEnvSource.js';
export { ProjectEnvSource, type ProjectEnvSourceOptions } from './resolver/sources/ProjectEnvSource.js';

// HTTP Client
// NodeHttpClient is now exported via dedicated entry point 'node' to avoid browser bundling issues
export type { IHttpClient } from '../types/http.js';

// Script Sandbox
export { ScriptSandbox, type SandboxOptions, type ScriptResult } from './sandbox/ScriptSandbox.js';
export { RadiusContextImpl } from './sandbox/context/RadiusContext.js';
export { ResponseContextImpl } from './sandbox/context/ResponseContext.js';

// Request Runner (Main Entry Point)
export { RequestRunner } from './RequestRunner.js';
