/// <reference types="node" />
/**
 * Unit tests for YamlParser.
 * 
 * Tests cover:
 * - Valid .rd file parsing
 * - Invalid YAML handling
 * - Schema validation errors
 * - Edge cases
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { YamlParser } from './YamlParser.js';
import type { IFileSystem } from '../../types/filesystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple Node.js filesystem adapter for tests
const nodeFs: IFileSystem = {
    readTextFile: (p: string) => fs.readFile(p, 'utf-8'),
    writeTextFile: (p: string, c: string) => fs.writeFile(p, c, 'utf-8'),
    exists: async (p: string) => { try { await fs.access(p); return true; } catch { return false; } },
    readDir: async (p: string) => {
        const entries = await fs.readdir(p, { withFileTypes: true });
        return entries.map((e: any) => ({ name: e.name, isFile: e.isFile(), isDirectory: e.isDirectory() }));
    },
    join: async (...paths: string[]) => path.join(...paths),
};

// Paths - relative to packages/core/src/runner/parser
const SCHEMA_PATH = path.resolve(__dirname, '../../../schemas/request.schema.json');
const EXAMPLES_PATH = path.resolve(__dirname, '../../../../../requests/examples');


describe('YamlParser', () => {
    let parser: YamlParser;

    beforeAll(async () => {
        parser = new YamlParser(SCHEMA_PATH, nodeFs);
        await parser.loadSchema();
    });

    describe('loadSchema', () => {
        it('should load the JSON schema successfully', async () => {
            const newParser = new YamlParser(SCHEMA_PATH, nodeFs);
            await expect(newParser.loadSchema()).resolves.toBeUndefined();
        });

        it('should throw error for non-existent schema', async () => {
            const badParser = new YamlParser('/non/existent/schema.json', nodeFs);
            await expect(badParser.loadSchema()).rejects.toThrow('Failed to load schema');
        });

        it('should only load schema once (idempotent)', async () => {
            const newParser = new YamlParser(SCHEMA_PATH, nodeFs);
            await newParser.loadSchema();
            await expect(newParser.loadSchema()).resolves.toBeUndefined();
        });
    });

    describe('parse', () => {
        it('should parse get_health.rd successfully', async () => {
            const filePath = path.join(EXAMPLES_PATH, 'get_health.rd');
            const result = await parser.parse(filePath);

            expect(result.meta.name).toBe('Health Check');
            expect(result.meta.type).toBe('REST');
            expect(result.meta.version).toBe(1);
            expect(result.request.method).toBe('GET');
            expect(result.request.url).toBe('{{baseUrl}}/health');
            expect(result.auth?.type).toBe('none');
        });

        it('should parse create_user.rd with body and scripts', async () => {
            const filePath = path.join(EXAMPLES_PATH, 'create_user.rd');
            const result = await parser.parse(filePath);

            expect(result.meta.name).toBe('Create User');
            expect(result.meta.type).toBe('REST');
            expect(result.request.method).toBe('POST');
            expect(result.request.body?.type).toBe('json');
            // Content is now stored as stringified text in V2
            const content = JSON.parse(result.request.body?.text || '{}');
            expect(content).toEqual({
                username: 'johndoe',
                email: 'john.doe@example.com',
                role: 'user',
            });
            expect(result.auth?.type).toBe('bearer');
            expect(result.auth?.token).toBe('{{env.ACCESS_TOKEN}}');
            expect(result.scripts?.pre).toContain('radius.uuid()');
            expect(result.scripts?.post).toContain('response.status === 201');
        });

        it('should parse get_users_gql.rd with GraphQL body', async () => {
            const filePath = path.join(EXAMPLES_PATH, 'get_users_gql.rd');
            const result = await parser.parse(filePath);

            expect(result.meta.name).toBe('Get Users (GraphQL)');
            expect(result.meta.type).toBe('GraphQL');
            expect(result.request.method).toBe('POST');
            expect(result.request.body?.type).toBe('graphql');
            expect(result.request.body?.graphql?.query).toContain('query GetUsers');

            const vars = JSON.parse(result.request.body?.graphql?.variables || '{}');
            expect(vars).toEqual({ limit: 10, offset: 0 });
        });

        it('should throw error for non-existent file', async () => {
            await expect(parser.parse('/non/existent/file.rd')).rejects.toThrow(
                'Failed to read file'
            );
        });
    });

    describe('parseContent', () => {
        it('should parse valid YAML content', () => {
            const yaml = `
meta:
  name: "Test Request"
  type: REST
  version: 1
request:
  method: GET
  url: "https://api.example.com/test"
`;
            const result = parser.parseContent(yaml);

            expect(result.meta.name).toBe('Test Request');
            expect(result.request.method).toBe('GET');
        });

        it('should throw error for invalid YAML syntax', () => {
            const invalidYaml = `
meta:
  name: "Test
  broken: yaml
`;
            expect(() => parser.parseContent(invalidYaml)).toThrow('Invalid YAML');
        });

        it('should throw error for missing required fields', () => {
            const missingFields = `
meta:
  name: "Test"
`;
            expect(() => parser.parseContent(missingFields)).toThrow('Validation failed');
        });

        it('should throw error for invalid enum values', () => {
            const invalidMethod = `
meta:
  name: "Test"
  type: REST
  version: 1
request:
  method: INVALID
  url: "https://example.com"
`;
            expect(() => parser.parseContent(invalidMethod)).toThrow('Validation failed');
        });
    });

    describe('validate', () => {
        it('should return valid for correct data', () => {
            const data = {
                meta: { name: 'Test', type: 'REST', version: 1 },
                request: { method: 'GET', url: 'https://example.com' },
            };
            const result = parser.validate(data);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors for invalid data', () => {
            const data = {
                meta: { name: 'Test' }, // Missing type and version
                request: { method: 'GET' }, // Missing url
            };
            const result = parser.validate(data);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should reject additional properties', () => {
            const data = {
                meta: { name: 'Test', type: 'REST', version: 1, extra: 'field' },
                request: { method: 'GET', url: 'https://example.com' },
            };
            const result = parser.validate(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.keyword === 'additionalProperties')).toBe(true);
        });
    });

    describe('isRequestFile', () => {
        it('should return true for .rd files', () => {
            expect(YamlParser.isRequestFile('request.rd')).toBe(true);
            expect(YamlParser.isRequestFile('/path/to/file.rd')).toBe(true);
            expect(YamlParser.isRequestFile('C:\\path\\to\\file.rd')).toBe(true);
        });

        it('should return false for other extensions', () => {
            expect(YamlParser.isRequestFile('request.yaml')).toBe(false);
            expect(YamlParser.isRequestFile('request.json')).toBe(false);
            expect(YamlParser.isRequestFile('request.txt')).toBe(false);
        });

        it('should be case-insensitive', () => {
            expect(YamlParser.isRequestFile('request.RD')).toBe(true);
            expect(YamlParser.isRequestFile('request.Rd')).toBe(true);
        });
    });
});
