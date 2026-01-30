/**
 * YAML Parser for .rd request definition files.
 * 
 * Responsibilities:
 * - Parse YAML content from .rd files
 * - Validate structure against request.schema.json
 * - Return typed RadiusRequest objects
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';
import AjvModule, { type ValidateFunction } from 'ajv';
import type { RadiusRequest, ValidationResult, ValidationError } from '../types.js';

// Handle both ESM and CJS module resolution for Ajv
const Ajv = AjvModule.default ?? AjvModule;

/**
 * Parser for .rd (Request Definition) files.
 * Handles YAML parsing and JSON Schema validation.
 */
export class YamlParser {
    private readonly ajv: InstanceType<typeof Ajv>;
    private validateFn: ValidateFunction | null = null;
    private schemaPath: string;
    private schemaLoaded = false;

    /**
     * Create a new YamlParser instance.
     * @param schemaPath - Path to the request.schema.json file
     */
    constructor(schemaPath: string) {
        this.schemaPath = schemaPath;
        this.ajv = new Ajv({
            allErrors: true,
            verbose: true,
            strict: true,
        });
    }

    /**
     * Load and compile the JSON Schema.
     * Called automatically on first parse, but can be called manually for eager loading.
     */
    async loadSchema(): Promise<void> {
        if (this.schemaLoaded) {
            return;
        }

        try {
            const schemaContent = await fs.readFile(this.schemaPath, 'utf-8');
            const schema = JSON.parse(schemaContent);
            this.validateFn = this.ajv.compile(schema);
            this.schemaLoaded = true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to load schema from ${this.schemaPath}: ${message}`);
        }
    }

    /**
     * Parse a .rd file from disk.
     * @param filePath - Path to the .rd file
     * @returns Parsed and validated RadiusRequest
     * @throws Error if file cannot be read, YAML is invalid, or validation fails
     */
    async parse(filePath: string): Promise<RadiusRequest> {
        // Ensure schema is loaded
        await this.loadSchema();

        // Read file content
        let content: string;
        try {
            content = await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to read file ${filePath}: ${message}`);
        }

        // Parse and validate
        return this.parseContent(content, filePath);
    }

    /**
     * Parse YAML content directly.
     * @param yamlContent - YAML string to parse
     * @param sourceName - Optional source name for error messages
     * @returns Parsed and validated RadiusRequest
     * @throws Error if YAML is invalid or validation fails
     */
    parseContent(yamlContent: string, sourceName = 'input'): RadiusRequest {
        // Ensure schema is loaded synchronously (must call loadSchema first for async)
        if (!this.validateFn) {
            throw new Error('Schema not loaded. Call loadSchema() before parseContent().');
        }

        // Parse YAML
        let data: unknown;
        try {
            data = yaml.load(yamlContent, {
                schema: yaml.DEFAULT_SCHEMA,
                json: true,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Invalid YAML in ${sourceName}: ${message}`);
        }

        // Validate against schema
        const validation = this.validate(data);
        if (!validation.valid) {
            const errorMessages = validation.errors
                .map(e => `  - ${e.path}: ${e.message}`)
                .join('\n');
            throw new Error(`Validation failed for ${sourceName}:\n${errorMessages}`);
        }

        return data as RadiusRequest;
    }

    /**
     * Validate data against the JSON Schema.
     * @param data - Data to validate
     * @returns Validation result with any errors
     */
    validate(data: unknown): ValidationResult {
        if (!this.validateFn) {
            return {
                valid: false,
                errors: [{ path: '', message: 'Schema not loaded' }],
            };
        }

        const valid = this.validateFn(data);

        if (valid) {
            return { valid: true, errors: [] };
        }

        // Convert AJV errors to our format
        const errors: ValidationError[] = (this.validateFn.errors ?? []).map(error => ({
            path: error.instancePath || '/',
            message: error.message ?? 'Unknown validation error',
            keyword: error.keyword,
        }));

        return { valid: false, errors };
    }

    /**
     * Check if a file is a valid .rd file.
     * @param filePath - Path to check
     * @returns True if file exists and has .rd extension
     */
    static isRequestFile(filePath: string): boolean {
        return path.extname(filePath).toLowerCase() === '.rd';
    }
}
