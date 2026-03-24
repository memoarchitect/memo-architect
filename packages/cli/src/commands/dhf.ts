// ─── memo export dhf ─────────────────────────────────────────────────────────
//
// Generates a Design History File (DHF) HTML report from the model.
// Contains: element inventory, traceability chains, validation summary,
// completeness per layer, and relationship coverage.
// ─────────────────────────────────────────────────────────────────────────────

import { resolve } from 'node:path';
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import chalk from 'chalk';
import { findConfigFile, parseFiles, buildMemoModel, modelToDTO, loadOntologyRegistries } from '@memo/core';
import type { BuilderRegistries } from '@memo/core';
import { validateModel } from '@memo/core';
import { computeCompleteness } from '@memo/core';
import type { ViewpointDTO, CosmaLayerDTO, MemoElement, MemoRelationship } from '@memo/core';
import { loadAndResolveConfig } from '../server/config-resolver.js';

function findSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = resolve(dir, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.memo') {
                files.push(...findSysmlFiles(full));
            } else if (entry.name.endsWith('.sysml')) {
                files.push(full);
            }
        }
    } catch { /* skip */ }
    return files;
}

export async function exportDhfCommand(options: {
    output?: string;
}): Promise<void> {
    const cwd = process.cwd();
    console.log(chalk.bold('\n📋 MEMO Export → Design History File (DHF)\n'));

    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('❌ No memo config found.'));
        process.exit(1);
    }

    const config = loadAndResolveConfig(configPath);
    console.log(chalk.gray(`Project: ${config.projectName}`));

    // Load ontology registries
    let ontologyRegistries: BuilderRegistries | undefined;
    try {
        const loadResult = await loadOntologyRegistries(configPath);
        if (loadResult.fileCount > 0) {
            ontologyRegistries = loadResult.registries;
        }
    } catch { /* skip */ }

    // Parse and build
    const sysmlFiles = findSysmlFiles(cwd);
    const { documents, errors: parseErrors } = await parseFiles(sysmlFiles, cwd + '/');
    const model = buildMemoModel(documents, config, parseErrors, ontologyRegistries);
    const validation = validateModel(model, config);
    const completeness = computeCompleteness(model, validation, config);

    // Gather data
    const elements = Array.from(model.elements.values());
    const relationships = model.relationships;

    const errors = validation.violations.filter(v => v.severity === 'error');
    const warnings = validation.violations.filter(v => v.severity === 'warning');

    // Group elements by layer
    const byLayer = new Map<string, MemoElement[]>();
    for (const el of elements) {
        if (!byLayer.has(el.layer)) byLayer.set(el.layer, []);
        byLayer.get(el.layer)!.push(el);
    }

    // Group relationships by type
    const byRelType = new Map<string, MemoRelationship[]>();
    for (const rel of relationships) {
        if (!byRelType.has(rel.type)) byRelType.set(rel.type, []);
        byRelType.get(rel.type)!.push(rel);
    }

    // Build traceability chains (element → outgoing rels → targets)
    const outgoing = new Map<string, MemoRelationship[]>();
    for (const rel of relationships) {
        if (!outgoing.has(rel.sourceId)) outgoing.set(rel.sourceId, []);
        outgoing.get(rel.sourceId)!.push(rel);
    }

    // Generate HTML
    const html = generateDhfHtml({
        projectName: config.projectName || 'MEMO Project',
        timestamp: new Date().toISOString(),
        elements,
        relationships,
        byLayer,
        byRelType,
        outgoing,
        validation,
        completeness,
        errors,
        warnings,
        elementMap: model.elements,
    });

    const outputPath = resolve(cwd, options.output || 'dhf-report.html');
    writeFileSync(outputPath, html);

    console.log(chalk.cyan(`  ${elements.length} elements, ${relationships.length} relationships`));
    console.log(chalk.cyan(`  ${validation.rulesEvaluated} rules evaluated, ${errors.length} errors, ${warnings.length} warnings`));
    console.log(chalk.green(`\n✅ DHF report written to ${outputPath}\n`));
}

// ─── HTML Generator ──────────────────────────────────────────────────────────

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface DhfData {
    projectName: string;
    timestamp: string;
    elements: MemoElement[];
    relationships: MemoRelationship[];
    byLayer: Map<string, MemoElement[]>;
    byRelType: Map<string, MemoRelationship[]>;
    outgoing: Map<string, MemoRelationship[]>;
    validation: ReturnType<typeof validateModel>;
    completeness: ReturnType<typeof computeCompleteness>;
    errors: any[];
    warnings: any[];
    elementMap: Map<string, MemoElement>;
}

function generateDhfHtml(data: DhfData): string {
    const { projectName, timestamp, elements, relationships, byLayer, byRelType, outgoing, validation, completeness, errors, warnings, elementMap } = data;

    const layerColors: Record<string, string> = {
        business: '#8E44AD', requirements: '#4A90D9', risk: '#E74C3C', functional: '#E67E22',
        behavior: '#FF6B6B', logical: '#7B68EE', physical: '#95A5A6', software: '#F39C12',
        interfaces: '#1ABC9C', verification: '#2ECC71', ui: '#3498DB',
    };

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DHF Report — ${esc(projectName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #f8f9fa; line-height: 1.6; }
  .container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
  h1 { font-size: 24px; font-weight: 700; color: #1B3A4B; margin-bottom: 4px; }
  h2 { font-size: 18px; font-weight: 600; color: #1B3A4B; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #2DD4A8; }
  h3 { font-size: 14px; font-weight: 600; color: #374151; margin: 16px 0 8px; }
  .meta { color: #6B7280; font-size: 13px; margin-bottom: 24px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 16px 0; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .card-value { font-size: 28px; font-weight: 700; color: #1B3A4B; }
  .card-label { font-size: 12px; color: #6B7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0 16px; }
  th, td { padding: 6px 10px; border: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; color: #374151; }
  tr:nth-child(even) { background: #f9fafb; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-error { background: #fef2f2; color: #dc2626; }
  .badge-warning { background: #fffbeb; color: #d97706; }
  .badge-ok { background: #ecfdf5; color: #10b981; }
  .pct-bar { display: inline-block; height: 8px; border-radius: 4px; }
  .layer-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <h1>Design History File</h1>
  <div class="meta">${esc(projectName)} &middot; Generated ${new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

  <!-- Summary -->
  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="card"><div class="card-value">${elements.length}</div><div class="card-label">Elements</div></div>
    <div class="card"><div class="card-value">${relationships.length}</div><div class="card-label">Relationships</div></div>
    <div class="card"><div class="card-value">${completeness.overall}%</div><div class="card-label">Completeness</div></div>
    <div class="card"><div class="card-value">${validation.rulesEvaluated}</div><div class="card-label">Rules Evaluated</div></div>
    <div class="card"><div class="card-value">${errors.length}</div><div class="card-label">Errors</div></div>
    <div class="card"><div class="card-value">${warnings.length}</div><div class="card-label">Warnings</div></div>
  </div>

  <!-- Completeness -->
  <h2>Completeness by Layer</h2>
  <table>
    <thead><tr><th>Layer</th><th>Coverage</th><th>Complete</th><th>Total</th></tr></thead>
    <tbody>`;

    for (const layer of completeness.layers) {
        if (layer.totalElements === 0) continue;
        const color = layerColors[layer.layerId] || '#6B7280';
        const pctColor = layer.percentage >= 80 ? '#10b981' : layer.percentage >= 50 ? '#d97706' : '#dc2626';
        html += `
      <tr>
        <td><span class="layer-dot" style="background:${color}"></span>${esc(layer.layerLabel)}</td>
        <td><span class="pct-bar" style="width:${layer.percentage}px;background:${pctColor}"></span> ${layer.percentage}%</td>
        <td>${layer.completeElements}</td>
        <td>${layer.totalElements}</td>
      </tr>`;
    }

    html += `
    </tbody>
  </table>

  <!-- Element Inventory -->
  <h2>Element Inventory</h2>`;

    for (const [layer, els] of Array.from(byLayer.entries()).sort()) {
        const color = layerColors[layer] || '#6B7280';
        html += `
  <h3><span class="layer-dot" style="background:${color}"></span>${esc(layer)} (${els.length})</h3>
  <table>
    <thead><tr><th>Name</th><th>Kind</th><th>Construct</th><th>File</th></tr></thead>
    <tbody>`;
        for (const el of els.sort((a, b) => a.name.localeCompare(b.name))) {
            html += `
      <tr><td>${esc(el.name)}</td><td>${esc(el.kind)}</td><td>${esc(el.construct)}</td><td style="color:#9ca3af;font-size:11px">${esc(el.file)}</td></tr>`;
        }
        html += `
    </tbody>
  </table>`;
    }

    // Traceability
    html += `
  <h2>Traceability</h2>
  <table>
    <thead><tr><th>Relationship Type</th><th>Count</th></tr></thead>
    <tbody>`;
    for (const [type, rels] of Array.from(byRelType.entries()).sort()) {
        html += `
      <tr><td>${esc(type)}</td><td>${rels.length}</td></tr>`;
    }
    html += `
    </tbody>
  </table>

  <h3>Trace Chains (first 50 elements)</h3>
  <table>
    <thead><tr><th>Source</th><th>Relationship</th><th>Target</th></tr></thead>
    <tbody>`;

    let traceCount = 0;
    for (const el of elements) {
        const rels = outgoing.get(el.id) || [];
        for (const rel of rels) {
            if (traceCount >= 200) break;
            const target = elementMap.get(rel.targetId);
            html += `
      <tr><td>${esc(el.name)} <span style="color:#9ca3af">(${esc(el.kind)})</span></td>
      <td><span class="badge" style="background:#eff6ff;color:#2563eb">${esc(rel.type)}</span></td>
      <td>${esc(target?.name || rel.targetId)} <span style="color:#9ca3af">(${esc(target?.kind || '?')})</span></td></tr>`;
            traceCount++;
        }
        if (traceCount >= 200) break;
    }

    html += `
    </tbody>
  </table>`;

    // Violations
    if (errors.length > 0 || warnings.length > 0) {
        html += `
  <h2>Validation Issues</h2>
  <table>
    <thead><tr><th>Severity</th><th>Rule</th><th>Element</th><th>Description</th></tr></thead>
    <tbody>`;
        for (const v of validation.violations) {
            const badge = v.severity === 'error' ? 'badge-error' : v.severity === 'warning' ? 'badge-warning' : 'badge-ok';
            html += `
      <tr><td><span class="badge ${badge}">${esc(v.severity)}</span></td><td>${esc(v.ruleId)}</td><td>${esc(v.elementName)} (${esc(v.elementKind)})</td><td>${esc(v.description)}</td></tr>`;
        }
        html += `
    </tbody>
  </table>`;
    }

    html += `
  <div class="footer">
    Generated by MEMO &middot; ${esc(timestamp)} &middot; ${elements.length} elements, ${relationships.length} relationships
  </div>
</div>
</body>
</html>`;

    return html;
}
