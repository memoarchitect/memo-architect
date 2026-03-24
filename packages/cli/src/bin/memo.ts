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
//   memo ontology show  — Show resolved ontology summary
//   memo ontology export— Export ontology as OWL/RDF or a SysAnd project
// ─────────────────────────────────────────────────────────────────────────────

import { Command } from 'commander';
import { validateCommand } from '../commands/validate.js';
import { devCommand } from '../commands/dev.js';
import { initCommand } from '../commands/init.js';
import { buildCommand } from '../commands/build.js';
import { exportJsonCommand, exportDotCommand } from '../commands/export.js';
import {
    ontologyShowCommand,
    ontologyExportOwlCommand,
    ontologyExportSysandCommand,
} from '../commands/ontology.js';
import { importCsvCommand, importRelCsvCommand, importTemplateCommand } from '../commands/import.js';
import { lockCommand } from '../commands/lock.js';

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
    .argument('[name]', 'Project name')
    .option('-t, --template <template>', 'Template to use', 'medical')
    .option('--ontology <package>', 'Ontology package to use', '@memo/medical-modeling-profile')
    .option('--list-ontologies', 'List available ontology packages')
    .action(async (name: string | undefined, options: { template: string; ontology: string; listOntologies?: boolean }) => {
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

program
    .command('lock')
    .description('Regenerate memo.lock.yaml from the current ontology')
    .action(async () => {
        await lockCommand();
    });

// ─── memo ontology ──────────────────────────────────────────────────────────

const ontologyCmd = program
    .command('ontology')
    .description('Ontology management commands');

ontologyCmd
    .command('show')
    .description('Show resolved ontology summary (kinds, relationships, rules)')
    .action(async () => {
        await ontologyShowCommand();
    });

const ontologyExportCmd = ontologyCmd
    .command('export')
    .description('Export ontology to standard formats');

ontologyExportCmd
    .command('owl')
    .description('Export ontology as OWL/RDF (Turtle)')
    .option('-o, --output <file>', 'Output file path')
    .option('--namespace <uri>', 'Ontology namespace URI', 'https://sysand.dev/ontology/memo#')
    .action(async (options: { output?: string; namespace?: string }) => {
        await ontologyExportOwlCommand({ ...options, format: 'turtle' });
    });

ontologyExportCmd
    .command('xml')
    .description('Export ontology as OWL/RDF (XML)')
    .option('-o, --output <file>', 'Output file path')
    .option('--namespace <uri>', 'Ontology namespace URI', 'https://sysand.dev/ontology/memo#')
    .action(async (options: { output?: string; namespace?: string }) => {
        await ontologyExportOwlCommand({ ...options, format: 'xml' });
    });

ontologyExportCmd
    .command('sysand')
    .description('Export ontology dependency stack as a SysAnd project')
    .option('-o, --output <dir>', 'Output directory path')
    .action(async (options: { output?: string }) => {
        await ontologyExportSysandCommand(options);
    });

// ─── memo import ──────────────────────────────────────────────────────────

const importCmd = program
    .command('import')
    .description('Import elements and relationships from CSV files');

importCmd
    .command('csv')
    .description('Import elements from a CSV file (generates .sysml)')
    .argument('<file>', 'CSV file path')
    .option('-o, --output <file>', 'Output .sysml file path')
    .option('--package <name>', 'SysML package name')
    .option('--dry-run', 'Preview generated SysML without writing')
    .action(async (file: string, options: { output?: string; package?: string; dryRun?: boolean }) => {
        await importCsvCommand(file, options);
    });

importCmd
    .command('csv-rel')
    .description('Import relationships from a CSV file (generates .sysml)')
    .argument('<file>', 'CSV file path')
    .option('-o, --output <file>', 'Output .sysml file path')
    .option('--package <name>', 'SysML package name')
    .option('--dry-run', 'Preview generated SysML without writing')
    .action(async (file: string, options: { output?: string; package?: string; dryRun?: boolean }) => {
        await importRelCsvCommand(file, options);
    });

importCmd
    .command('template')
    .description('Generate a template CSV based on the ontology (elements or relationships)')
    .argument('<type>', 'Template type: "elements" or "relationships"')
    .option('-o, --output <file>', 'Output CSV file path')
    .action(async (type: string, options: { output?: string }) => {
        await importTemplateCommand(type, options);
    });

program.parse();
