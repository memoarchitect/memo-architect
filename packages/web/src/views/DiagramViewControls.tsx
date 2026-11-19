import { ControlButton } from '@xyflow/react';

export function DiagramViewControls({ onFit }: { onFit: () => void }) {
    return (
        <>
            <ControlButton
                title="Fit diagram to view"
                aria-label="Fit diagram to view"
                onClick={onFit}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
                    <path d="M3 8l5-5M21 8l-5-5M21 16l-5 5M3 16l5 5" />
                </svg>
            </ControlButton>
            <ControlButton
                title="Toggle fullscreen canvas"
                aria-label="Toggle fullscreen canvas"
                onClick={event => {
                    const canvas = event.currentTarget.closest('.react-flow');
                    if (!canvas) return;
                    if (document.fullscreenElement) void document.exitFullscreen();
                    else void canvas.requestFullscreen?.();
                }}
            >
                ⛶
            </ControlButton>
        </>
    );
}
