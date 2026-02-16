/**
 * Environment Profile Types
 * Supports both V1 (Simple Key-Value) and V2 (Structured) schemas.
 */

/**
 * Supported variable types for V2 schema.
 */
export type VariableType = 'string' | 'number' | 'boolean';

/**
 * Structured variable definition (V2 Mode B).
 */
export interface VariableDefinition {
    /** The actual value of the variable */
    value: string;

    /** Data type for validation/documentation (default: 'string') */
    type?: VariableType;

    /** Human-readable description */
    description?: string;

    /** If true, this variable is masked in logs/output */
    sensitive?: boolean;

    /** If true, this variable is enabled (default: true) */
    enabled?: boolean;
}

/**
 * Metadata for the environment profile.
 */
export interface EnvironmentMeta {
    /** Schema version (2 for V2) */
    version: number;

    /** Human-readable name */
    name: string;

    /** Description of the environment */
    description?: string;
}

/**
 * V2 Environment Profile Structure.
 */
export interface EnvironmentProfileV2 {
    /** Metadata block */
    meta: EnvironmentMeta;

    /** 
     * Variables map.
     * In V2, this is a map of key -> VariableDefinition.
     */
    variables: Record<string, VariableDefinition>;
}

/**
 * Legacy V1 Environment Profile Structure.
 * Simple Key-Value pairs with a separate secrets list.
 */
export interface EnvironmentProfileV1 {
    name: string;
    variables: Record<string, string>;
    secrets: string[];
}

/**
 * Accessor interface for internal use.
 * This is what the application deals with after normalization.
 */
export type EnvironmentProfile = EnvironmentProfileV2;
