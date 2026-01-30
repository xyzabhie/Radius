import pc from 'picocolors';
import type { RadiusResponse } from '../../core/runner/types.js';

// Box drawing characters
const BOX = {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    teeRight: '├',
    teeLeft: '┤',
    cross: '┼',
};

const WIDTH = 55;

/** Secret masker function */
let secretMasker: ((text: string) => string) | null = null;

/**
 * Set the secret masker function.
 */
export function setSecretMasker(masker: (text: string) => string): void {
    secretMasker = masker;
}

/**
 * Mask secrets in text if masker is set.
 */
function mask(text: string): string {
    return secretMasker ? secretMasker(text) : text;
}

/**
 * Create a horizontal line.
 */
function line(char = BOX.horizontal): string {
    return char.repeat(WIDTH - 2);
}

/**
 * Create a box top border with optional title.
 */
function boxTop(title?: string): string {
    if (title) {
        const padding = WIDTH - 4 - title.length;
        return `${BOX.topLeft}${BOX.horizontal} ${title} ${BOX.horizontal.repeat(Math.max(0, padding))}${BOX.topRight}`;
    }
    return `${BOX.topLeft}${line()}${BOX.topRight}`;
}

/**
 * Create a box bottom border.
 */
function boxBottom(): string {
    return `${BOX.bottomLeft}${line()}${BOX.bottomRight}`;
}

/**
 * Create a box row with content.
 */
function boxRow(content: string): string {
    const stripped = stripAnsi(content);
    const padding = Math.max(0, WIDTH - 4 - stripped.length);
    return `${BOX.vertical}  ${content}${' '.repeat(padding)}${BOX.vertical}`;
}

/**
 * Strip ANSI codes for length calculation.
 */
function stripAnsi(str: string): string {
    return str.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Print the Radius header.
 */
export function printHeader(): void {
    console.log();
    console.log(boxTop());
    console.log(boxRow(pc.bold(pc.cyan('RADIUS'))));
    console.log(boxBottom());
    console.log();
}

/**
 * Print environment indicator.
 */
export function printEnvironment(name: string): void {
    console.log(`${pc.magenta('◆')} Environment: ${pc.bold(pc.magenta(name))}`);
    console.log();
}

/**
 * Print running indicator.
 */
export function printRunning(path: string): void {
    console.log(`${pc.cyan('▶')} Running: ${pc.dim(path)}`);
    console.log();
}

/**
 * Print response summary.
 */
export function printResponse(response: RadiusResponse): void {
    const isSuccess = response.status >= 200 && response.status < 400;
    const statusIcon = isSuccess ? pc.green('✓') : pc.red('✗');
    const statusText = isSuccess
        ? pc.green(`${response.status} ${response.statusText}`)
        : pc.red(`${response.status} ${response.statusText}`);

    console.log(boxTop('Response'));
    console.log(boxRow(`${statusIcon} ${statusText}`));
    console.log(boxRow(''));

    // Timing
    console.log(boxRow(pc.dim('Timing')));
    if (response.timing.ttfb !== undefined) {
        console.log(boxRow(`${pc.dim('├─')} TTFB:     ${pc.yellow(response.timing.ttfb + 'ms')}`));
    }
    if (response.timing.download !== undefined) {
        console.log(boxRow(`${pc.dim('├─')} Download: ${pc.yellow(response.timing.download + 'ms')}`));
    }
    console.log(boxRow(`${pc.dim('└─')} Total:    ${pc.bold(pc.yellow(response.timing.total + 'ms'))}`));

    console.log(boxBottom());
    console.log();
}

/**
 * Print assertion results.
 */
export function printAssertions(assertions: Array<{ passed: boolean; message: string; expected?: unknown; actual?: unknown }>): void {
    if (assertions.length === 0) {
        return;
    }

    const passed = assertions.filter(a => a.passed).length;
    const failed = assertions.length - passed;

    console.log(boxTop('Assertions'));

    for (const assertion of assertions) {
        const icon = assertion.passed ? pc.green('✓') : pc.red('✗');
        console.log(boxRow(`${icon} ${mask(assertion.message)}`));

        if (!assertion.passed && assertion.expected !== undefined) {
            console.log(boxRow(`  ${pc.dim('Expected:')} ${pc.green(mask(JSON.stringify(assertion.expected)))}`));
            console.log(boxRow(`  ${pc.dim('Actual:')}   ${pc.red(mask(JSON.stringify(assertion.actual)))}`));
        }
    }

    console.log(boxRow(''));
    const summary = failed > 0
        ? `${pc.green(passed + ' passed')}, ${pc.red(failed + ' failed')}`
        : pc.green(`${passed} passed`);
    console.log(boxRow(summary));
    console.log(boxBottom());
    console.log();
}

/**
 * Print script logs (with secret masking).
 */
export function printLogs(logs: string[]): void {
    if (logs.length === 0) {
        return;
    }

    console.log(boxTop('Logs'));
    for (const log of logs) {
        console.log(boxRow(pc.dim(mask(log))));
    }
    console.log(boxBottom());
    console.log();
}

/**
 * Print final summary.
 */
export function printSummary(response: RadiusResponse, allPassed: boolean): void {
    const icon = allPassed ? pc.green('✓') : pc.red('✗');
    const action = allPassed ? 'Completed' : 'Failed';
    const color = allPassed ? pc.green : pc.red;

    console.log(`${icon} ${color(action)} in ${pc.bold(response.timing.total + 'ms')}`);
    console.log();
}

/**
 * Print batch summary for directory runs.
 */
export function printBatchSummary(results: Array<{ file: string; response: RadiusResponse; passed: boolean }>): void {
    console.log();

    for (const result of results) {
        const icon = result.passed ? pc.green('✓') : pc.red('✗');
        const status = result.response.status > 0
            ? `${result.response.status} ${result.response.statusText}`
            : 'Error';
        const statusColor = result.passed ? pc.green : pc.red;
        const time = pc.dim(`${result.response.timing.total}ms`);

        const fileName = result.file.padEnd(25);
        console.log(`  ${icon} ${pc.dim(fileName)} ${statusColor(status.padEnd(15))} ${time}`);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    console.log();
    const summary = failed > 0
        ? `Summary: ${pc.green(passed + ' passed')}, ${pc.red(failed + ' failed')}`
        : `Summary: ${pc.green(passed + ' passed')}`;
    console.log(summary);

    const totalTime = results.reduce((sum, r) => sum + r.response.timing.total, 0);
    console.log(`Total time: ${pc.bold(totalTime + 'ms')}`);
    console.log();
}

/**
 * Print error message.
 */
export function printError(message: string): void {
    console.log();
    console.log(`${pc.red('✗')} ${pc.red('Error:')} ${mask(message)}`);
    console.log();
}

/**
 * Print session saved indicator.
 */
export function printSessionSaved(filePath: string, count: number): void {
    console.log(`${pc.blue('💾')} Session saved: ${pc.dim(filePath)} (${count} variables)`);
    console.log();
}

