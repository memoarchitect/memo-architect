/** Compact, consistently cropped MEMO brand mark for workspace headers and empty states. */
export function MemoBrandMark({ size = 150, opacity = 0.55 }: { size?: number; opacity?: number }) {
    return (
        <div aria-label="MEMO Architect" title="MEMO Architect" style={{ position: 'relative', width: size, height: Math.round(size * 0.62), overflow: 'hidden', flexShrink: 0, opacity }}>
            <img src="/logo.png" alt="" aria-hidden="true" style={{ display: 'block', width: size, height: size, objectFit: 'contain', transform: `translateY(-${Math.round(size * 0.12)}px)`, mixBlendMode: 'multiply' }} />
            <span style={{ position: 'absolute', left: '59%', top: Math.round(size * 0.47), color: '#8B949E', fontSize: Math.max(12, Math.round(size * 0.09)), fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>Architect</span>
        </div>
    );
}
