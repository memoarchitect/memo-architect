// ─── BulkImportModal ─────────────────────────────────────────────────────────
//
// Multi-step modal for bulk importing elements from CSV or pasted table data.
//
//  Step 1 — Input:   paste CSV / upload file, pick a recipe preset
//  Step 2 — Mapping: confirm / adjust column → attribute mappings
//  Step 3 — Preview: first 20 rows parsed, errors highlighted, confirm button
//
// Issues: #124 (bulk import UI), #134 (column-mapping assistant)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { sendCsvImport } from '../store/ws-client';
import type { ColumnMapping, ImportRecipe } from '@memo/tools/browser';
import { BUILTIN_RECIPES, inferColumnMappings, applyColumnMappings } from '@memo/tools/browser';
import { FONT } from '../styles/tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'input' | 'mapping' | 'preview';

interface ParsedPreviewRow {
    rowIndex: number;
    id: string;
    name: string;
    kind: string;
    doc: string;
    [key: string]: string | number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTsvToRows(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [] };

    // Detect delimiter: tab or comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    const parse = (line: string): string[] =>
        line.split(delimiter).map((f) => f.replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim());

    const headers = parse(lines[0]);
    const rows = lines.slice(1).map((line) => {
        const vals = parse(line);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        return row;
    });
    return { headers, rows };
}

// MEMO standard attribute targets for the mapping dropdowns
const STANDARD_TARGETS = ['id', 'name', 'kind', 'construct', 'doc', '— skip —'];

// ─── Component ───────────────────────────────────────────────────────────────

export function BulkImportModal(): React.ReactElement | null {
    const bulkImportOpen  = useModelStore((s) => s.bulkImportOpen);
    const setBulkImportOpen = useModelStore((s) => s.setBulkImportOpen);
    const importResult    = useModelStore((s) => s.importResult);
    const clearImportResult = useModelStore((s) => s.clearImportResult);
    const model           = useModelStore((s) => s.model);

    const overlayRef = useRef<HTMLDivElement>(null);

    // ── Step state ────────────────────────────────────────────────────────────
    const [step, setStep] = useState<Step>('input');

    // Step 1
    const [rawText,     setRawText]     = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState<ImportRecipe | null>(null);
    const [packageName, setPackageName] = useState('bulk_import');
    const [inputError,  setInputError]  = useState('');

    // Step 2
    const [headers,   setHeaders]   = useState<string[]>([]);
    const [rawRows,   setRawRows]   = useState<Record<string, string>[]>([]);
    const [mappings,  setMappings]  = useState<ColumnMapping[]>([]);

    // Step 3
    const [previewRows,   setPreviewRows]   = useState<ParsedPreviewRow[]>([]);
    const [previewErrors, setPreviewErrors] = useState<string[]>([]);
    const [previewWarn,   setPreviewWarn]   = useState<string[]>([]);
    const [finalCsv,      setFinalCsv]      = useState('');
    const [sending,       setSending]       = useState(false);

    // Derived: unique kinds already in model (for autocomplete)
    const modelKinds = React.useMemo(() => {
        if (!model) return [] as string[];
        return Array.from(new Set(Object.values(model.elements).map((e) => e.kind))).sort();
    }, [model]);

    // Reset on open/close
    useEffect(() => {
        if (!bulkImportOpen) {
            setStep('input');
            setRawText('');
            setSelectedRecipe(null);
            setPackageName('bulk_import');
            setInputError('');
            setHeaders([]);
            setRawRows([]);
            setMappings([]);
            setPreviewRows([]);
            setPreviewErrors([]);
            setPreviewWarn([]);
            setFinalCsv('');
            setSending(false);
            clearImportResult();
        }
    }, [bulkImportOpen, clearImportResult]);

    // Watch importResult — when we get a result, we're done sending
    useEffect(() => {
        if (importResult) setSending(false);
    }, [importResult]);

    // ── Close ─────────────────────────────────────────────────────────────────
    const handleClose = useCallback(() => {
        setBulkImportOpen(false);
    }, [setBulkImportOpen]);

    // ── File upload ───────────────────────────────────────────────────────────
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            setRawText(text);
            setInputError('');
            // Auto-set package name from filename
            const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
            if (base) setPackageName(base);
        };
        reader.readAsText(file);
    }, []);

    // ── Step 1 → 2: parse headers and infer mappings ─────────────────────────
    const handleNextFromInput = useCallback(() => {
        if (!rawText.trim()) {
            setInputError('Paste CSV data or upload a file first.');
            return;
        }
        const { headers: h, rows: r } = parseTsvToRows(rawText);
        if (h.length === 0) {
            setInputError('Could not parse headers. Make sure the first row contains column names.');
            return;
        }
        if (r.length === 0) {
            setInputError('No data rows found after the header row.');
            return;
        }
        setHeaders(h);
        setRawRows(r);
        setMappings(inferColumnMappings(h, selectedRecipe ?? undefined));
        setInputError('');
        setStep('mapping');
    }, [rawText, selectedRecipe]);

    // ── Step 2 → 3: apply mappings and produce preview ────────────────────────
    const handleNextFromMapping = useCallback(() => {
        const defaultKind = selectedRecipe?.defaultKind;
        const result = applyColumnMappings(rawRows, mappings, {} as any, defaultKind);
        setFinalCsv(result.csv);
        setPreviewWarn(result.warnings);

        // Parse CSV for preview
        const lines = result.csv.trim().split('\n');
        if (lines.length < 2) {
            setPreviewErrors(['No rows to preview after applying mappings.']);
            setPreviewRows([]);
            setStep('preview');
            return;
        }
        const hdrs = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
        const preview: ParsedPreviewRow[] = [];
        const errs: string[] = [];

        lines.slice(1, 21).forEach((line, idx) => {
            const vals = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
            const row: ParsedPreviewRow = { rowIndex: idx + 1, id: '', name: '', kind: '', doc: '' };
            hdrs.forEach((h, i) => { row[h] = vals[i] ?? ''; });
            if (!row['id']) errs.push(`Row ${idx + 2}: missing id`);
            if (!row['name']) errs.push(`Row ${idx + 2}: missing name`);
            if (!row['kind']) errs.push(`Row ${idx + 2}: missing kind`);
            preview.push(row);
        });

        setPreviewRows(preview);
        setPreviewErrors(errs);
        setStep('preview');
    }, [rawRows, mappings, selectedRecipe]);

    // ── Step 3: send import ───────────────────────────────────────────────────
    const handleImport = useCallback(() => {
        if (!finalCsv) return;
        setSending(true);
        clearImportResult();
        sendCsvImport({
            elementsCsv: finalCsv,
            packageName: packageName || 'bulk_import',
        });
    }, [finalCsv, packageName, clearImportResult]);

    // ── Update one mapping ────────────────────────────────────────────────────
    const updateMapping = useCallback((idx: number, targetAttribute: string) => {
        setMappings((prev) => prev.map((m, i) => i === idx ? { ...m, targetAttribute } : m));
    }, []);

    if (!bulkImportOpen) return null;

    // ── Render ────────────────────────────────────────────────────────────────
    const STEP_LABELS: Record<Step, string> = {
        input: '1 · Input',
        mapping: '2 · Map columns',
        preview: '3 · Preview & Import',
    };
    const STEP_ORDER: Step[] = ['input', 'mapping', 'preview'];
    const stepIdx = STEP_ORDER.indexOf(step);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.35)' }}
            onMouseDown={(e) => { if (e.target === overlayRef.current) handleClose(); }}
        >
            <div
                className="flex flex-col rounded-2xl overflow-hidden"
                style={{
                    width: 680, maxHeight: '90vh',
                    background: '#FFFFFF',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                    border: '1px solid #E5E5E0',
                }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4"
                    style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#2DD4A8', margin: 0 }}>
                            Bulk Import Elements
                        </h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>
                            Import from CSV, Excel paste, or requirements spreadsheet
                        </p>
                    </div>
                    <button onClick={handleClose} style={CLOSE_BTN_STYLE}>✕</button>
                </div>

                {/* ── Step indicator ── */}
                <div className="flex" style={{ borderBottom: '1px solid #F0F0EC', background: '#FAFAF8', flexShrink: 0 }}>
                    {STEP_ORDER.map((s, i) => (
                        <div key={s} className="flex-1 flex items-center justify-center py-2.5"
                            style={{
                                fontSize: FONT.xs, fontWeight: i === stepIdx ? 700 : 400,
                                color: i === stepIdx ? '#1B3A4B' : i < stepIdx ? '#2D6A7A' : '#9CA3AF',
                                borderBottom: i === stepIdx ? '2px solid #2D6A7A' : '2px solid transparent',
                            }}
                        >
                            {STEP_LABELS[s]}
                        </div>
                    ))}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5" style={{ minHeight: 0 }}>

                    {/* ════ STEP 1: INPUT ════ */}
                    {step === 'input' && (
                        <div className="flex flex-col gap-4">
                            {/* Recipe picker */}
                            <div>
                                <label style={LABEL_STYLE}>Artifact type (recipe preset)</label>
                                <select
                                    value={selectedRecipe?.id ?? ''}
                                    onChange={(e) => {
                                        const r = BUILTIN_RECIPES.find(r => r.id === e.target.value) ?? null;
                                        setSelectedRecipe(r);
                                    }}
                                    style={INPUT_STYLE}
                                >
                                    <option value="">— Custom / no preset —</option>
                                    {BUILTIN_RECIPES.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                {selectedRecipe && (
                                    <p style={{ fontSize: FONT.xs, color: '#6B7280', marginTop: 4 }}>
                                        {selectedRecipe.description}
                                    </p>
                                )}
                            </div>

                            {/* Package name */}
                            <div>
                                <label style={LABEL_STYLE}>Package name <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(for the generated .sysml file)</span></label>
                                <input
                                    type="text"
                                    value={packageName}
                                    onChange={(e) => setPackageName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                                    style={INPUT_STYLE}
                                    placeholder="bulk_import"
                                />
                            </div>

                            {/* CSV text area */}
                            <div>
                                <label style={LABEL_STYLE}>CSV data <span style={{ color: '#E74C3C' }}>*</span></label>
                                <textarea
                                    value={rawText}
                                    onChange={(e) => { setRawText(e.target.value); setInputError(''); }}
                                    placeholder={"Paste CSV or tab-separated data here.\nFirst row must be the header.\n\nExample:\nid,name,kind,doc\nreq_001,System shall be safe,Requirement,Safety requirement"}
                                    rows={10}
                                    style={{
                                        ...INPUT_STYLE,
                                        resize: 'vertical', fontFamily: 'monospace',
                                        fontSize: '12px', lineHeight: '1.5',
                                    }}
                                />
                                {inputError && (
                                    <p style={{ fontSize: FONT.xs, color: '#E74C3C', marginTop: 4 }}>{inputError}</p>
                                )}
                            </div>

                            {/* File upload */}
                            <div className="flex items-center gap-3">
                                <span style={{ fontSize: FONT.xs, color: '#6B7280' }}>or upload a file:</span>
                                <label style={{
                                    cursor: 'pointer', padding: '4px 12px', borderRadius: 6,
                                    background: '#F3F4F6', border: '1px solid #E5E5E0',
                                    fontSize: FONT.xs, color: '#374151',
                                }}>
                                    Browse…
                                    <input type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                                </label>
                                {rawText && (
                                    <span style={{ fontSize: FONT.xs, color: '#6B7280' }}>
                                        {rawText.split('\n').length} line(s) loaded
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ════ STEP 2: COLUMN MAPPING ════ */}
                    {step === 'mapping' && (
                        <div className="flex flex-col gap-3">
                            <p style={{ fontSize: FONT.xs, color: '#6B7280', margin: 0 }}>
                                Map each source column to a MEMO attribute. <strong>id</strong>, <strong>name</strong>, and <strong>kind</strong> are required.
                                Unrecognised columns are passed through as dynamic attributes.
                            </p>

                            <div style={{ border: '1px solid #E5E5E0', borderRadius: 8, overflow: 'hidden' }}>
                                {/* Table header */}
                                <div className="flex" style={{ background: '#F8F8F5', padding: '8px 12px', borderBottom: '1px solid #E5E5E0' }}>
                                    <span style={{ flex: 1, fontSize: FONT.xs, fontWeight: 600, color: '#374151' }}>Source column</span>
                                    <span style={{ flex: 1, fontSize: FONT.xs, fontWeight: 600, color: '#374151' }}>Maps to</span>
                                    <span style={{ width: 80, fontSize: FONT.xs, fontWeight: 600, color: '#374151' }}>Transform</span>
                                </div>

                                {mappings.map((m, idx) => {
                                    const isRequired = ['id', 'name', 'kind'].includes(m.targetAttribute);
                                    const isSkip = !m.targetAttribute;
                                    // Unique targets already used (prevent double-mapping fixed fields)
                                    const usedFixed = mappings.filter((mm, ii) => ii !== idx && ['id','name','kind','doc','construct'].includes(mm.targetAttribute)).map(mm => mm.targetAttribute);
                                    const availableTargets = STANDARD_TARGETS.filter(t => t === '— skip —' || !usedFixed.includes(t) || t === m.targetAttribute);

                                    return (
                                        <div key={idx} className="flex items-center"
                                            style={{ padding: '6px 12px', borderBottom: idx < mappings.length - 1 ? '1px solid #F0F0EC' : 'none', background: isRequired ? '#F0FDF4' : 'transparent' }}>
                                            <div style={{ flex: 1, fontSize: FONT.xs, color: '#374151', fontFamily: 'monospace' }}>
                                                {m.sourceColumn}
                                            </div>
                                            <div style={{ flex: 1, paddingRight: 8 }}>
                                                <select
                                                    value={m.targetAttribute || ''}
                                                    onChange={(e) => updateMapping(idx, e.target.value === '— skip —' ? '' : e.target.value)}
                                                    style={{
                                                        width: '100%', fontSize: FONT.xs,
                                                        padding: '3px 6px', borderRadius: 5,
                                                        border: `1px solid ${isSkip ? '#E5E5E0' : isRequired ? '#22C55E' : '#E5E5E0'}`,
                                                        background: isSkip ? '#F9FAFB' : '#FFFFFF',
                                                        color: isSkip ? '#9CA3AF' : '#1a1a1a',
                                                    }}
                                                >
                                                    {availableTargets.map((t) => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                    {/* Also allow any kind-specific dynamic attribute */}
                                                    {m.targetAttribute && !STANDARD_TARGETS.includes(m.targetAttribute) && (
                                                        <option value={m.targetAttribute}>{m.targetAttribute}</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div style={{ width: 80, fontSize: '10px', color: '#9CA3AF' }}>
                                                {m.transform ?? '—'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Preview of first 3 raw rows */}
                            {rawRows.length > 0 && (
                                <details>
                                    <summary style={{ fontSize: FONT.xs, color: '#6B7280', cursor: 'pointer', marginTop: 4 }}>
                                        Show raw data sample ({Math.min(rawRows.length, 3)} of {rawRows.length} rows)
                                    </summary>
                                    <div style={{ marginTop: 6, overflowX: 'auto' }}>
                                        <table style={{ fontSize: '10px', borderCollapse: 'collapse', width: '100%' }}>
                                            <thead>
                                                <tr>{headers.map(h => <th key={h} style={TH_STYLE}>{h}</th>)}</tr>
                                            </thead>
                                            <tbody>
                                                {rawRows.slice(0, 3).map((r, i) => (
                                                    <tr key={i}>{headers.map(h => <td key={h} style={TD_STYLE}>{r[h] ?? ''}</td>)}</tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            )}
                        </div>
                    )}

                    {/* ════ STEP 3: PREVIEW ════ */}
                    {step === 'preview' && (
                        <div className="flex flex-col gap-4">
                            {/* Errors */}
                            {previewErrors.length > 0 && (
                                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
                                    <p style={{ fontSize: FONT.xs, fontWeight: 700, color: '#DC2626', margin: '0 0 4px' }}>
                                        {previewErrors.length} validation error(s) — rows with missing required fields will be skipped
                                    </p>
                                    {previewErrors.slice(0, 5).map((e, i) => (
                                        <p key={i} style={{ fontSize: '11px', color: '#DC2626', margin: '1px 0' }}>{e}</p>
                                    ))}
                                    {previewErrors.length > 5 && (
                                        <p style={{ fontSize: '11px', color: '#DC2626', margin: '2px 0 0' }}>+{previewErrors.length - 5} more…</p>
                                    )}
                                </div>
                            )}

                            {/* Warnings */}
                            {previewWarn.length > 0 && (
                                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px' }}>
                                    <p style={{ fontSize: FONT.xs, fontWeight: 700, color: '#D97706', margin: '0 0 4px' }}>
                                        {previewWarn.length} warning(s)
                                    </p>
                                    {previewWarn.slice(0, 3).map((w, i) => (
                                        <p key={i} style={{ fontSize: '11px', color: '#D97706', margin: '1px 0' }}>{w}</p>
                                    ))}
                                </div>
                            )}

                            {/* Import result (after send) */}
                            {importResult && (
                                <div style={{
                                    background: importResult.success ? '#F0FDF4' : '#FEF2F2',
                                    border: `1px solid ${importResult.success ? '#86EFAC' : '#FECACA'}`,
                                    borderRadius: 8, padding: '12px 14px',
                                }}>
                                    <p style={{ fontSize: FONT.xs, fontWeight: 700, margin: '0 0 4px', color: importResult.success ? '#16A34A' : '#DC2626' }}>
                                        {importResult.success
                                            ? `Import complete — ${importResult.elementsImported} element(s) written to ${importResult.generatedFile ?? 'model'}`
                                            : 'Import failed'}
                                    </p>
                                    {importResult.errors.map((e, i) => (
                                        <p key={i} style={{ fontSize: '11px', color: '#DC2626', margin: '1px 0' }}>{e}</p>
                                    ))}
                                    {importResult.warnings.slice(0, 3).map((w, i) => (
                                        <p key={i} style={{ fontSize: '11px', color: '#D97706', margin: '1px 0' }}>{w}</p>
                                    ))}
                                </div>
                            )}

                            {/* Preview table */}
                            {previewRows.length > 0 && (
                                <>
                                    <p style={{ fontSize: FONT.xs, color: '#6B7280', margin: 0 }}>
                                        Showing first {previewRows.length} of {rawRows.length} row(s)
                                        {rawRows.length > previewRows.length && ` (+${rawRows.length - previewRows.length} more will be imported)`}
                                    </p>
                                    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E5E0' }}>
                                        <table style={{ fontSize: '11px', borderCollapse: 'collapse', width: '100%' }}>
                                            <thead>
                                                <tr style={{ background: '#F8F8F5' }}>
                                                    <th style={TH_STYLE}>#</th>
                                                    <th style={TH_STYLE}>id</th>
                                                    <th style={TH_STYLE}>name</th>
                                                    <th style={TH_STYLE}>kind</th>
                                                    <th style={TH_STYLE}>doc</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewRows.map((row) => {
                                                    const hasError = !row['id'] || !row['name'] || !row['kind'];
                                                    return (
                                                        <tr key={row.rowIndex} style={{ background: hasError ? '#FEF9F9' : 'transparent' }}>
                                                            <td style={TD_STYLE_MONO}>{row.rowIndex}</td>
                                                            <td style={{ ...TD_STYLE_MONO, color: row['id'] ? '#1a1a1a' : '#DC2626' }}>{row['id'] || '⚠ missing'}</td>
                                                            <td style={{ ...TD_STYLE, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row['name'] || '—')}</td>
                                                            <td style={{ ...TD_STYLE, color: row['kind'] ? '#1B3A4B' : '#DC2626' }}>{row['kind'] || '⚠ missing'}</td>
                                                            <td style={{ ...TD_STYLE, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6B7280' }}>
                                                                {String(row['doc'] || '—')}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            {previewRows.length === 0 && previewErrors.length === 0 && (
                                <p style={{ fontSize: FONT.xs, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>
                                    No rows to preview.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderTop: '1px solid #F0F0EC', background: '#FAFAF8', flexShrink: 0 }}>
                    <div className="flex gap-2">
                        {step !== 'input' && !importResult && (
                            <button
                                onClick={() => setStep(STEP_ORDER[stepIdx - 1]!)}
                                style={SECONDARY_BTN_STYLE}
                            >
                                ← Back
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 items-center">
                        <button onClick={handleClose} style={SECONDARY_BTN_STYLE}>
                            {importResult?.success ? 'Done' : 'Cancel'}
                        </button>

                        {!importResult && (
                            <>
                                {step === 'input' && (
                                    <button onClick={handleNextFromInput} style={PRIMARY_BTN_STYLE}>
                                        Next →
                                    </button>
                                )}
                                {step === 'mapping' && (
                                    <button onClick={handleNextFromMapping} style={PRIMARY_BTN_STYLE}>
                                        Preview →
                                    </button>
                                )}
                                {step === 'preview' && (
                                    <button
                                        onClick={handleImport}
                                        disabled={sending || previewRows.length === 0}
                                        style={{
                                            ...PRIMARY_BTN_STYLE,
                                            opacity: (sending || previewRows.length === 0) ? 0.5 : 1,
                                            cursor: (sending || previewRows.length === 0) ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {sending ? 'Importing…' : `Import ${rawRows.length} element(s)`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const LABEL_STYLE: React.CSSProperties = {
    display: 'block', fontSize: FONT.xs, fontWeight: 600,
    color: '#374151', marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 8,
    border: '1px solid #E5E5E0', fontSize: FONT.sm,
    color: '#1a1a1a', background: '#FAFAF8',
    boxSizing: 'border-box',
};

const CLOSE_BTN_STYLE: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
    color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
    padding: '6px 10px', fontSize: '14px',
};

const PRIMARY_BTN_STYLE: React.CSSProperties = {
    padding: '7px 18px', borderRadius: 8,
    background: '#1B3A4B', border: 'none',
    color: '#FFFFFF', fontSize: FONT.xs, fontWeight: 600,
    cursor: 'pointer',
};

const SECONDARY_BTN_STYLE: React.CSSProperties = {
    padding: '7px 14px', borderRadius: 8,
    background: 'transparent', border: '1px solid #E5E5E0',
    color: '#374151', fontSize: FONT.xs,
    cursor: 'pointer',
};

const TH_STYLE: React.CSSProperties = {
    padding: '5px 8px', textAlign: 'left', fontWeight: 600,
    fontSize: '10px', color: '#6B7280',
    borderBottom: '1px solid #E5E5E0',
    whiteSpace: 'nowrap',
};

const TD_STYLE: React.CSSProperties = {
    padding: '4px 8px', fontSize: '11px', color: '#1a1a1a',
    borderBottom: '1px solid #F5F5F2',
};

const TD_STYLE_MONO: React.CSSProperties = {
    ...TD_STYLE,
    fontFamily: 'monospace', fontSize: '10px', color: '#6B7280',
};
