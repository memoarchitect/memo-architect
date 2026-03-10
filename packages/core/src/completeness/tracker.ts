// ─── Completeness Tracker ─────────────────────────────────────────────────────
//
// Computes per-layer and overall completeness percentages based on
// validation results and the model's element distribution.
// ─────────────────────────────────────────────────────────────────────────────

import type { MEMOConfig } from '../model/config.js';
import type { MemoModel } from '../model/semantic.js';
import type { ValidationResult, CompletenessReport, LayerCompleteness } from '../validator/types.js';

/**
 * Compute completeness from model + validation results.
 *
 * An element is "complete" if it has no error-severity violations.
 * Warnings and info violations do not affect completeness.
 */
export function computeCompleteness(
    model: MemoModel,
    validation: ValidationResult,
    config: MEMOConfig
): CompletenessReport {
    // Build set of element IDs with error violations
    const elementsWithErrors = new Set<string>();
    for (const v of validation.violations) {
        if (v.severity === 'error') {
            elementsWithErrors.add(v.elementId);
        }
    }

    const layers: LayerCompleteness[] = [];
    let totalElements = 0;
    let completeElements = 0;

    for (const layer of config.cosmaLayers || []) {
        const layerElements = model.elementsByLayer.get(layer.id) || [];
        const total = layerElements.length;
        const complete = layerElements.filter(e => !elementsWithErrors.has(e.id)).length;

        totalElements += total;
        completeElements += complete;

        layers.push({
            layerId: layer.id,
            layerLabel: layer.label,
            layerColor: layer.color,
            totalElements: total,
            completeElements: complete,
            percentage: total > 0 ? Math.round((complete / total) * 100) : 100,
        });
    }

    // Include elements in unknown layers
    const unknownElements = model.elementsByLayer.get('unknown') || [];
    totalElements += unknownElements.length;
    completeElements += unknownElements.filter(e => !elementsWithErrors.has(e.id)).length;

    return {
        layers,
        overall: totalElements > 0 ? Math.round((completeElements / totalElements) * 100) : 100,
        totalElements,
        completeElements,
    };
}
