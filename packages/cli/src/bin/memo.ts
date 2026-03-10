#!/usr/bin/env node
// ─── MEMO CLI Entry Point ────────────────────────────────────────────────────
//
// Commands:
//   memo dev       — Start development server with live reload
//   memo validate  — Validate model against closure rules
//   memo init      — Scaffold a new project (TODO)
// ─────────────────────────────────────────────────────────────────────────────

import { Command } from 'commander';
import { validateCommand } from '../commands/validate.js';
import { devCommand } from '../commands/dev.js';

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
        console.log(`TODO: memo init ${name} --template ${options.template}`);
    });

program.parse();
