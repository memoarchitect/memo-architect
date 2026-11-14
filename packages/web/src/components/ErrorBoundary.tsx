import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    /** What failed, in the message: "This view", "The Explorer". */
    label: string;
    /** A new value clears the error, so navigating elsewhere renders again. */
    resetKey: string;
    children: ReactNode;
}

interface State { error: Error | null; resetKey: string }

/**
 * Keeps a render error inside the region that threw it. Without one, React unmounts the whole app and leaves a
 * blank page, so one failing panel takes the toolbar, the Explorer and every other view down with it.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null, resetKey: this.props.resetKey };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
        return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`${this.props.label} failed to render`, error, info.componentStack);
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;
        return (
            <div role="alert" className="flex-1 flex items-center justify-center p-6" style={{ background: '#F7F7F5' }}>
                <div style={{ maxWidth: 520, color: '#1a1a1a' }}>
                    <div className="text-sm font-semibold">{this.props.label} failed to render</div>
                    <pre className="text-xs mt-2 p-2 rounded" style={{ background: '#FDECEC', color: '#9B1C1C', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {error.message}
                    </pre>
                    <div className="text-xs mt-2" style={{ color: '#6B7280' }}>
                        The rest of the app still works. The browser console has the full error.
                    </div>
                    <button
                        type="button"
                        className="text-xs mt-3 px-3 py-1 rounded border"
                        style={{ borderColor: '#D1D5DB', background: '#FFFFFF' }}
                        onClick={() => this.setState({ error: null })}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }
}
