#!/usr/bin/env node

import { Command } from 'commander';
import { architectBuildCommand } from '../commands/build.js';
import { architectDevCommand } from '../commands/dev.js';
import {
    architectExampleCommand, listArchitectExamples, listArchitectTemplates,
} from '../commands/example.js';

const program = new Command();

program
    .name('memo-architect')
    .description('MEMO Architect — interactive and distributable model workbench')
    .version('0.6.3')
    .option('--example <name>', 'Open a bundled example project (e.g. gpca, standard-sysml-diagrams). A local checkout is opened in place; an installed package is opened read-only in a disposable copy')
    .option('--read-only', 'Always open the example in a disposable copy, even from a local checkout')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('--no-open', 'Do not open a browser')
    .action(async (options: { example?: string; port: string; open: boolean; readOnly?: boolean }) => {
        if (options.example) {
            await architectExampleCommand({
                name: options.example,
                port: Number.parseInt(options.port, 10),
                open: options.open,
                readOnly: options.readOnly,
            });
            return;
        }
        program.help();
    });

/**
 * Read an option that is declared on both this command and its parent.
 *
 * `-p, --port` and `--no-open` exist on the program so `--example` can take
 * them, and on `dev` so it can too. Commander binds the flag on the command
 * line to the program-level declaration, leaving the subcommand holding its
 * own default — which silently pinned `dev --port` to 3000. Prefer whichever
 * declaration the user actually set, falling back to the local default.
 */
function resolveOption<T>(command: Command, name: string, local: T): T {
    if (command.getOptionValueSource(name) === 'cli') return local;
    const parent = command.parent;
    if (parent?.getOptionValueSource(name) === 'cli') return parent.opts()[name] as T;
    return local;
}

program
    .command('dev')
    .description('Start Architect with live model reload')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('--no-open', 'Do not open a browser')
    .action(async function (this: Command, options: { port: string; open: boolean }) {
        const port = resolveOption(this, 'port', options.port);
        const open = resolveOption(this, 'open', options.open);
        await architectDevCommand({ port: Number.parseInt(String(port), 10), open });
    });

program
    .command('examples')
    .description('List bundled example IDs accepted by --example')
    .action(() => {
        console.log('Available examples:');
        for (const id of listArchitectExamples()) console.log(`  ${id}`);
        console.log('\nOpen one with: memo-architect --example <id>');
    });

program
    .command('templates')
    .description('List project templates available through MEMO Tools')
    .action(() => {
        console.log('Available project templates:');
        for (const id of listArchitectTemplates()) console.log(`  ${id}`);
        console.log('\nCreate one with: memo init <project> --template <id>');
    });

program
    .command('build')
    .description('Build a static Architect viewer with embedded project data')
    .option('-o, --output <dir>', 'Output directory', 'dist')
    .option('--standalone', 'Inline the entry JavaScript and CSS into index.html')
    .action(async (options: { output: string; standalone?: boolean }) => {
        await architectBuildCommand(options);
    });

program.parse();
