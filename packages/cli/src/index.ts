#!/usr/bin/env node
/**
 * Radius CLI - Entry Point
 * 
 * API request runner for .rd files.
 */

import { Command } from 'commander';
import { runCommand } from './commands/run.js';

const program = new Command();

program
    .name('radius')
    .description('API request runner for .rd files')
    .version('1.0.0');

program
    .command('run <path>')
    .description('Execute a .rd file or all .rd files in a directory')
    .option('-e, --env <name>', 'Environment file to load from environments/')
    .option('-v, --verbose', 'Show detailed output including headers')
    .option('-s, --save-vars <file>', 'Save session variables to JSON file after run')
    .action(runCommand);

program.parse();
