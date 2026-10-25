import { formatQuantity } from '@memoarchitect/tools/browser';
import { useModelStore } from '../../store/model-store';

/**
 * A quantity attribute written `20 [milli*second]` read as `20 ms`, from the
 * symbols the standard library gives its units (shipped with the model, never
 * kept here). Nothing renders for a value that is not a quantity.
 */
export function QuantityHint({ value, fontSize = 10 }: { value: string; fontSize?: number }) {
    const symbols = useModelStore(s => s.model?.registries?.unitSymbols);
    const shown = formatQuantity(value, symbols);
    if (!shown) return null;
    return <div data-testid="quantity-hint" style={{ color: '#6B7280', fontSize, marginTop: 2 }}>= {shown}</div>;
}
