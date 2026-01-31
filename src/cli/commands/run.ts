/**
 * Run command for Radius CLI.
 * 
 * Executes .rd files individually or in batch from a directory.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { RequestRunner } from '../../core/runner/RequestRunner.js';
import { EnvironmentManager } from '../../core/environment/EnvironmentManager.js';
import { SessionManager } from '../../core/session/SessionManager.js';
import type { RadiusResponse } from '../../core/runner/types.js';
import {
    printHeader,
    printRunning,
    printResponse,
    printAssertions,
    printLogs,
    printSummary,
    printBatchSummary,
    printError,
    printEnvironment,
    printSessionSaved,
    setSecretMasker,
} from '../utils/formatter.js';

interface RunOptions {
    env?: string;
    verbose?: boolean;
    saveVars?: string;
}

/** Current environment manager instance */
let envManager: EnvironmentManager | null = null;

/** Current session manager instance */
let sessionManager: SessionManager | null = null;

/**
 * Run command handler.
 */
export async function runCommand(targetPath: string, options: RunOptions): Promise<void> {
    printHeader();

    const absolutePath = path.resolve(targetPath);
    const projectRoot = process.cwd();

    // Initialize session manager for request chaining
    sessionManager = new SessionManager();

    // Load environment if specified
    if (options.env) {
        envManager = new EnvironmentManager({ projectRoot });
        try {
            const profile = await envManager.load(options.env);
            printEnvironment(profile.name);

            // Set secret masker for all output
            setSecretMasker((text) => envManager!.maskSecrets(text));
        } catch (error) {
            printError((error as Error).message);
            process.exit(1);
        }
    }

    try {
        const stats = await fs.stat(absolutePath);

        if (stats.isDirectory()) {
            await runDirectory(absolutePath, options);
        } else if (stats.isFile()) {
            await runFile(absolutePath, options);
        } else {
            printError(`Invalid path: ${targetPath}`);
            process.exit(1);
        }

        // Save session variables if requested
        if (options.saveVars && sessionManager) {
            await sessionManager.saveToFile(options.saveVars);
            printSessionSaved(options.saveVars, sessionManager.size);
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            printError(`Path not found: ${targetPath}`);
        } else {
            printError((error as Error).message);
        }
        process.exit(1);
    }
}

/**
 * Run a single .rd file.
 */
async function runFile(filePath: string, options: RunOptions): Promise<void> {
    printRunning(path.relative(process.cwd(), filePath));

    const runner = createRunner(options);

    try {
        const response = await runner.run(filePath);
        printResponse(response);

        // Extract assertion results from response
        const assertions = (response as any)._assertions || [];
        printAssertions(assertions);

        // Extract logs from response
        const logs = (response as any)._scriptLogs || [];
        printLogs(logs);

        // Determine if all passed
        const assertionsPassed = assertions.every((a: any) => a.passed);
        const httpSuccess = response.status >= 200 && response.status < 400;
        const allPassed = httpSuccess && (assertions.length === 0 || assertionsPassed);

        printSummary(response, allPassed);

        if (!allPassed) {
            process.exit(1);
        }
    } catch (error) {
        printError((error as Error).message);
        process.exit(1);
    }
}

/**
 * Run all .rd files in a directory (with request chaining).
 * Variables set in one request persist to subsequent requests.
 */
async function runDirectory(dirPath: string, options: RunOptions): Promise<void> {
    const files = await findRdFiles(dirPath);

    if (files.length === 0) {
        printError(`No .rd files found in: ${dirPath}`);
        process.exit(1);
    }

    console.log(`▶ Running ${files.length} requests in: ${path.relative(process.cwd(), dirPath) || '.'}/`);

    // Create a single runner with session for chaining
    const runner = createRunner(options);
    const results: Array<{ file: string; response: RadiusResponse; passed: boolean }> = [];

    for (const file of files) {
        try {
            const response = await runner.run(file);
            const assertions = (response as any)._assertions || [];
            const assertionsPassed = assertions.every((a: any) => a.passed);
            const httpSuccess = response.status >= 200 && response.status < 400;
            const passed = httpSuccess && (assertions.length === 0 || assertionsPassed);

            results.push({
                file: path.basename(file),
                response,
                passed,
            });
        } catch (error) {
            results.push({
                file: path.basename(file),
                response: {
                    status: 0,
                    statusText: 'Error',
                    headers: {},
                    body: (error as Error).message,
                    json: null,
                    timing: { total: 0 },
                    request: { method: 'UNKNOWN', url: '', headers: {} },
                },
                passed: false,
            });
        }
    }

    printBatchSummary(results);

    const hasFailures = results.some(r => !r.passed);
    if (hasFailures) {
        process.exit(1);
    }
}

/**
 * Find all .rd files in a directory.
 */
async function findRdFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const rdFiles: string[] = [];

    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.rd')) {
            rdFiles.push(path.join(dirPath, entry.name));
        }
    }

    return rdFiles.sort();
}

/**
 * Create a RequestRunner with the given options.
 */
function createRunner(options: RunOptions): RequestRunner {
    const projectRoot = process.cwd();
    const variableSources = [];

    // Add environment variable source (highest priority)
    if (envManager) {
        const envSource = envManager.getVariableSource();
        if (envSource) {
            variableSources.push(envSource);
        }
    }

    const runner = new RequestRunner({
        projectRoot,
        variableSources,
    });

    // Attach session manager for request chaining
    if (sessionManager) {
        runner.setSession(sessionManager);
    }

    return runner;
}
