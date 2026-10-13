// The model as the chosen workspace shows it (plan A1). Pages that list or count the model read
// this; code that writes, or looks one element up to edit it, keeps reading the whole model.

import { useMemo } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { scopeModel } from '../lib/workspace-scope';
import { useModelStore } from './model-store';

export function useScopedModel(): MemoModelDTO | null {
    const model = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    return useMemo(() => (model ? scopeModel(model, workspace) : null), [model, workspace]);
}
