import { describe, expect, it } from 'vitest';
import { boxTitleOverrides, labelStylesOf, labelTextOverrides } from '../label-style';

describe('label style', () => {
    it('reads a connector\'s and a port\'s label style from the layout, and nothing else', () => {
        const styles = labelStylesOf({
            nodes: { box: { x: 0, y: 0, textColor: '#111', ports: {
                p1: { x: 0, y: 0, textColor: '#222', textOrientation: 'vertical' },
                p2: { x: 0, y: 0, side: 'left' },
            } } },
            edges: { e1: { color: '#f00', fontSize: 14 }, e2: { color: '#0f0' } },
        });
        expect(styles.ports).toEqual({ p1: { textColor: '#222', textOrientation: 'vertical' } });
        expect(styles.edges).toEqual({ e1: { fontSize: 14 } });
    });

    it('overrides only what was chosen, and turns vertical text to read bottom to top', () => {
        expect(labelTextOverrides(undefined)).toEqual({});
        expect(labelTextOverrides({ fontSize: 12 })).toEqual({ fontSize: '12px' });
        expect(boxTitleOverrides({ textOrientation: 'horizontal' })).toEqual({});
        expect(boxTitleOverrides({ textOrientation: 'vertical' })).toMatchObject({ writingMode: 'vertical-rl', transform: 'rotate(180deg)' });
    });
});
