#!/usr/bin/env node

import { Command } from 'commander';
import { architectBuildCommand } from '../commands/build.js';
import { architectDevCommand } from '../commands/dev.js';
import { architectExampleCommand } from '../commands/example.js';

const program = new Command();

program
    .name('memo-architect')
    .description('MEMO Architect — interactive and distributable model workbench')
    .version('0.5.0')
    .option('--example <name>', 'Open a bundled example project read-only in a disposable copy (e.g. gpca, standard-sysml-diagrams)')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('--no-open', 'Do not open a browser')
    .action(async (options: { example?: string; port: string; open: boolean }) => {
        if (options.example) {
            await architectExampleCommand({
                name: options.example,
                port: Number.parseInt(options.port, 10),
                open: options.open,
            });
            return;
        }
        program.help();
    });

program
    .command('dev')
    .description('Start Architect with live model reload')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('--no-open', 'Do not open a browser')
    .action(async (options: { port: string; open: boolean }) => {
        await architectDevCommand({ port: Number.parseInt(options.port, 10), open: options.open });
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
