import { FONT } from '../styles/tokens';

/** Shared count indicator for all explorer hierarchy rows. */
export function ExplorerCountBadge({ count, color, title }: { count: number; color: string; title?: string }) {
    return (
        <span
            className="px-1.5 py-0.5 rounded-full"
            style={{
                background: color + '25',
                color,
                fontSize: FONT.explorer.count,
                fontWeight: 600,
                minWidth: '20px',
                textAlign: 'center',
            }}
            title={title}
        >
            {count}
        </span>
    );
}
