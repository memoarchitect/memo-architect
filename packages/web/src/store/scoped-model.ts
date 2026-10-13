// The model as the chosen workspace shows it (plan A1). Pages that list or count the model read
// this; code that writes, or looks one element up to edit it, keeps reading the whole model.

import { useMemo } from 'react';
import type { MemoModelDTO, ValidationResult } from '@memoarchitect/tools/browser';
import { scopeModel, validationForWorkspace } from '../lib/workspace-scope';
import { useModelStore } from './model-store';

export function useScopedModel(): MemoModelDTO | null {
    const model = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    return useMemo(() => (model ? scopeModel(model, workspace) : null), [model, workspace]);
}

/**
 * The validation result as the chosen workspace shows it. memo-tools runs the rules once per
 * workspace (`memo validate --workspace`, plan T3) and sends each result with the whole one, so
 * this picks an answer and never filters the whole result by element: filtering would skip the
 * rule that another system's evidence does not count, and show a different number from the CLI.
 * The whole result when no workspace is chosen, or the server sent none for it.
 */
export function useScopedValidation(): ValidationResult | null {
    const validation = useModelStore(s => s.validation);
    const workspace = useModelStore(s => s.workspace);
    return validationForWorkspace(validation, workspace);
}
