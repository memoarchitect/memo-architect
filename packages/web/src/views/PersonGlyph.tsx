interface PersonGlyphProps {
    color?: string;
    size?: number;
}

/** Shared UML-style symbol for human Actor and User elements. */
export function PersonGlyph({ color = '#334155', size = 38 }: PersonGlyphProps) {
    const height = Math.round(size * 1.42);
    return <svg width={size} height={height} viewBox="0 0 38 54" aria-hidden="true" fill="none" stroke={color} strokeWidth="2">
        <circle cx="19" cy="8" r="6" fill="#FFFFFF" />
        <path d="M19 14v18M6 23h26M19 32L8 49M19 32l11 17" strokeLinecap="round" />
    </svg>;
}

export const isPersonKind = (kind: string | undefined): boolean => kind === 'Actor' || kind === 'User';
