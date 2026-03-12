#!/usr/bin/env node
// ─── MEMO CLI Entry Point ────────────────────────────────────────────────────
//
// Commands:
//   memo dev            — Start development server with live reload
//   memo validate       — Validate model against closure rules
//   memo init           — Scaffold a new project
//   memo build          — Build static HTML site with embedded model
//   memo export json    — Export model as JSON
//   memo export dot     — Export model as Graphviz DOT
// ─────────────────────────────────────────────────────────────────────────────

import { Command } from 'commander';
import { validateCommand } from '../commands/validate.js';
import { devCommand } from '../commands/dev.js';
import { initCommand } from '../commands/init.js';
import { buildCommand } from '../commands/build.js';
import { exportJsonCommand, exportDotCommand } from '../commands/export.js';

const program = new Command();

program
    .name('memo')
    .description('MEMO — Model-Based Systems Engineering for Medical Devices')
    .version('0.1.0');

program
    .command('validate')
    .description('Validate the model against closure rules and show completeness')
    .argument('[dir]', 'Project directory', '.')
    .action(async (dir: string) => {
        await validateCommand(dir);
    });

program
    .command('dev')
    .description('Start development server with live model reload')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('--no-open', 'Do not open browser')
    .action(async (options: { port: string; open: boolean }) => {
        await devCommand({
            port: parseInt(options.port, 10),
            open: options.open,
        });
    });

program
    .command('init')
    .description('Scaffold a new MEMO project')
    .argument('<name>', 'Project name')
    .option('-t, --template <template>', 'Template to use', 'medical')
    .action(async (name: string, options: { template: string }) => {
        await initCommand(name, options);
    });

program
    .command('build')
    .description('Build a self-contained static HTML site with the model diagram')
    .option('-o, --output <dir>', 'Output directory', 'dist')
    .option('--single-file', 'Inline all assets into a single index.html')
    .action(async (options: { output: string; singleFile?: boolean }) => {
        await buildCommand(options);
    });

const exportCmd = program
    .command('export')
    .description('Export model to various formats');

exportCmd
    .command('json')
    .description('Export full model as JSON')
    .option('-o, --output <file>', 'Output file path', 'memo-model.json')
    .option('--no-pretty', 'Minified JSON output')
    .action(async (options: { output: string; pretty: boolean }) => {
        await exportJsonCommand(options);
    });

exportCmd
    .command('dot')
    .description('Export model as Graphviz DOT format')
    .option('-o, --output <file>', 'Output file path', 'memo-model.dot')
    .option('--viewpoint <id>', 'Filter by viewpoint ID')
    .action(async (options: { output: string; viewpoint?: string }) => {
        await exportDotCommand(options);
    });

program.parse();
