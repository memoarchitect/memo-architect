import { useEffect, useMemo, useRef, useState } from 'react';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { requestScreenCaptureUpload } from '../store/ws-client';
import { ScreenLayoutView } from './ScreenLayoutView';
import { captureForScreen, captureForSelectionContext, computeScreenLayout, listCaptures, type Rect } from './templates/geometry-view';
import { Icon, IconButton, IconToggle, ToolbarCluster, ToolbarSep } from './DiagramToolbarControls';
import { FONT } from '../styles/tokens';
import { detectBoundariesFromImage } from './templates/boundary-detection';
import type { ScreenRegionProposal } from './ScreenLayoutView';
import { ExplorerTreeRow } from '../components/ExplorerTreeRow';
import { MemoBrandMark } from '../components/MemoBrandMark';

const boundsAttributes = (bounds: Rect) => ({
    'bounds.x': String(Number(bounds.x.toFixed(5))),
    'bounds.y': String(Number(bounds.y.toFixed(5))),
    'bounds.width': String(Number(bounds.width.toFixed(5))),
    'bounds.height': String(Number(bounds.height.toFixed(5))),
});

const relativeRect = (child: Rect, parent: Rect): Rect => ({
    x: (child.x - parent.x) / parent.width,
    y: (child.y - parent.y) / parent.height,
    width: child.width / parent.width,
    height: child.height / parent.height,
});

const assetUri = (raw: string | undefined) => !raw ? ''
    : raw.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `/${raw}`;

function fileData(file: File): Promise<{ base64: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'));
        reader.onload = () => {
            const url = String(reader.result);
            const image = new Image();
            image.onerror = () => reject(new Error('The selected file is not a readable image.'));
            image.onload = () => resolve({
                base64: url.slice(url.indexOf(',') + 1),
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
            image.src = url;
        };
        reader.readAsDataURL(file);
    });
}

export function nextUiElementId(elements: MemoElement[]): string {
    const highest = elements.reduce((max, element) => {
        const numbers = [element.id, element.shortId, element.attributes.id]
            .map(value => /^UIE-(\d+)$/i.exec(value ?? ''))
            .filter((match): match is RegExpExecArray => !!match)
            .map(match => Number(match[1]));
        return Math.max(max, ...numbers);
    }, 0);
    return `UIE-${String(highest + 1).padStart(3, '0')}`;
}

export function nextUiAssetId(captures: MemoElement[]): string {
    const highest = captures.reduce((max, capture) => {
        const numbers = [capture.id, capture.shortId, capture.attributes.id]
            .map(value => /^UIA-(\d+)$/i.exec(value ?? ''))
            .filter((match): match is RegExpExecArray => !!match)
            .map(match => Number(match[1]));
        return Math.max(max, ...numbers);
    }, 0);
    return `UIA-${String(highest + 1).padStart(3, '0')}`;
}

export function usageIdentifier(stableId: string, prefix: string, elements: MemoElement[]): string {
    const suffix = stableId.match(/(\d+)$/)?.[1] ?? '1';
    const base = `${prefix}${Number(suffix)}`;
    const ids = new Set(elements.map(element => element.id));
    if (!ids.has(base)) return base;
    let counter = 2;
    while (ids.has(`${base}_${counter}`)) counter++;
    return `${base}_${counter}`;
}

function screenForLayout(layout: { id: string; name: string }, screens: MemoElement[]): MemoElement | undefined {
    const byId = screens.find(screen => screen.id === layout.id);
    if (byId) return byId;
    const normalizedLayout = layout.name.toLowerCase().replace(/region layout|screen layout|[^a-z0-9]/g, '');
    return screens.find(screen => {
        const normalizedScreen = screen.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedScreen.length > 0
            && (normalizedLayout.includes(normalizedScreen) || normalizedScreen.includes(normalizedLayout));
    });
}

async function waitForElement(id: string, optimistic: MemoElement | undefined): Promise<void> {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        const current = useModelStore.getState().model?.elements[id];
        // createModelElement inserts an optimistic copy immediately. Relationships
        // must wait for the server rebuild, where legality sees the new endpoint.
        if (current && current !== optimistic) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('The new element was saved, but the rebuilt model did not arrive.');
}

async function waitForRelationship(type: string, sourceId: string, targetId: string): Promise<boolean> {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        const relationship = useModelStore.getState().model?.relationships.find(candidate =>
            candidate.type.toLowerCase() === type.toLowerCase()
            && candidate.sourceId === sourceId
            && candidate.targetId === targetId);
        if (relationship) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
}

const hasRelationship = (type: string, sourceId: string, targetId: string) =>
    !!useModelStore.getState().model?.relationships.some(candidate =>
        candidate.type.toLowerCase() === type.toLowerCase()
        && candidate.sourceId === sourceId
        && candidate.targetId === targetId);

/** Dedicated screen-layout authoring and traceability surface. */
export function UiScreensWorkspace() {
    const model = useModelStore(s => s.model);
    const createModelElement = useModelStore(s => s.createModelElement);
    const persistElementAttributes = useModelStore(s => s.persistElementAttributes);
    const createRelationship = useModelStore(s => s.createRelationship);
    const createDiagram = useModelStore(s => s.createDiagram);
    const inspectElement = useModelStore(s => s.inspectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const deleteModelElement = useModelStore(s => s.deleteModelElement);
    const [selectedId, setSelectedId] = useState<string>();
    const [captureId, setCaptureId] = useState<string>();
    const [drawMode, setDrawMode] = useState(false);
    const [build, setBuild] = useState('');
    const [status, setStatus] = useState('');
    const [createScreenOpen, setCreateScreenOpen] = useState(false);
    const [screenName, setScreenName] = useState('NewUIScreen');
    const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);
    const [proposals, setProposals] = useState<ScreenRegionProposal[]>([]);
    const [collapsedTree, setCollapsedTree] = useState<Set<string>>(new Set());
    const proposalElementIds = useRef(new Map<string, string>());
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const layouts = useMemo(
        () => (model?.diagrams ?? []).filter(diagram => diagram.viewKind === 'geometry'),
        [model],
    );
    const captures = useMemo(() => model ? listCaptures(model) : [], [model]);
    const screens = useMemo(
        () => model ? Object.values(model.elements).filter(element =>
            element.kind === 'UIElement' && element.attributes['formKind']?.endsWith('screen')) : [],
        [model],
    );
    const selected = useMemo(() => layouts.find(layout => layout.id === selectedId), [layouts, selectedId]);
    const selectedScreen = useMemo(
        () => selected ? screenForLayout(selected, screens) : undefined,
        [selected, screens],
    );
    const captureOwner = useMemo(() => {
        const owners = new Map<string, string>();
        for (const relationship of model?.relationships ?? []) {
            if (relationship.type.toLowerCase() === 'capturesscreen') owners.set(relationship.sourceId, relationship.targetId);
        }
        return owners;
    }, [model]);
    const linkedCaptures = useMemo(
        () => selectedScreen
            ? captures.filter(capture => captureOwner.get(capture.id) === selectedScreen.id)
            : [],
        [captureOwner, captures, selectedScreen],
    );

    useEffect(() => {
        if (!layouts.some(layout => layout.id === selectedId)) setSelectedId(layouts[0]?.id);
    }, [layouts, selectedId]);
    useEffect(() => {
        if (!linkedCaptures.some(capture => capture.id === captureId)) {
            setCaptureId(linkedCaptures[0]?.id ?? '__none__');
        }
    }, [captureId, linkedCaptures]);
    useEffect(() => {
        setProposals([]);
        proposalElementIds.current.clear();
    }, [captureId]);

    if (!model) return null;
    const scene = computeScreenLayout(model, { captureId });
    const uiElements = Object.values(model.elements).filter(element => element.kind === 'UIElement');
    const screen = selectedScreen ?? scene.screen;
    const byStableId = new Map(uiElements.map(element => [element.id, element]));
    const composedChildren = new Map<string, MemoElement[]>();
    for (const relationship of model.relationships) {
        if (relationship.type.toLowerCase() !== 'composes') continue;
        const child = byStableId.get(relationship.targetId);
        if (!child) continue;
        composedChildren.set(relationship.sourceId, [...(composedChildren.get(relationship.sourceId) ?? []), child]);
    }

    const selectLayout = (layoutId: string, screenElement?: MemoElement, element?: MemoElement) => {
        setSelectedId(layoutId);
        const contextCapture = screenElement && element
            ? captureForSelectionContext(model, screenElement.id, element.id)
            : screenElement ? captureForScreen(model, screenElement.id) : undefined;
        if (contextCapture) setCaptureId(contextCapture.id);
        if (element) inspectElement(element.id);
    };

    const toggleTree = (id: string) => setCollapsedTree(current => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const renderRegionBranch = (element: MemoElement, layoutId: string, screenElement: MemoElement, depth: number): React.ReactNode => (
        <div key={element.id} role="none">
            <ExplorerTreeRow
                id={`element:${element.id}`}
                label={element.name}
                depth={depth}
                hasChildren={(composedChildren.get(element.id) ?? []).length > 0}
                expanded={!collapsedTree.has(`element:${element.id}`)}
                selected={element.id === selectedElementId}
                badge="UIE"
                badgeColor="#0F766E"
                count={(composedChildren.get(element.id) ?? []).length || undefined}
                title={`${element.name} · ${element.attributes.formKind ?? 'UIElement'}`}
                onClick={() => {
                    if ((composedChildren.get(element.id) ?? []).length) toggleTree(`element:${element.id}`);
                    selectLayout(layoutId, screenElement, element);
                }}
                onDelete={() => deleteModelElement(element.id)}
            />
            {!collapsedTree.has(`element:${element.id}`) && (composedChildren.get(element.id) ?? [])
                .map(child => renderRegionBranch(child, layoutId, screenElement, depth + 1))}
        </div>
    );

    const createLink = async (type: string, sourceId: string, targetId: string) => {
        let lastError = '';
        for (let attempt = 0; attempt < 3; attempt++) {
            if (hasRelationship(type, sourceId, targetId)) return;
            const result = await createRelationship({
                type, sourceId, targetId, direction: 'outgoing', selectedElementId: sourceId,
            });
            if (result.success && await waitForRelationship(type, sourceId, targetId)) return;
            lastError = result.success
                ? 'The relationship was written but did not appear in the rebuilt model.'
                : result.error ?? 'The relationship could not be created.';
            await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        }
        throw new Error(lastError || `Could not connect ${targetId} beneath ${sourceId}.`);
    };

    const createRootScreen = async () => {
        const name = screenName.trim();
        if (!name) return;
        setStatus('Creating UI screen…');
        try {
            const stableId = nextUiElementId(uiElements);
            const elementId = usageIdentifier(stableId, 'uiElement', uiElements);
            const optimisticId = createModelElement({
                id: elementId,
                name,
                kind: 'UIElement',
                construct: 'part',
                layer: 'implementation',
                file: 'model/generated.sysml',
                doc: '',
                attributes: {
                    id: stableId,
                    description: `Root user-interface screen ${name}.`,
                    formKind: 'UIElementFormKind::screen',
                    disclosureKind: 'UIDisclosureKind::inline',
                    detectionMethod: 'BoundsDetectionKind::manual',
                    'bounds.x': '0', 'bounds.y': '0', 'bounds.width': '1', 'bounds.height': '1',
                },
            });
            await waitForElement(optimisticId, useModelStore.getState().model?.elements[optimisticId]);
            const viewpointId = model.viewpoints?.find(viewpoint =>
                viewpoint.label.toLowerCase().includes('ui layout'))?.id ?? '__model';
            createDiagram({
                // The geometry is the UIElement's authored view, not another
                // semantic parent between the screen and its child UIElements.
                id: stableId,
                name: `${name} — Region Layout`,
                diagramType: 'bdd',
                viewKind: 'geometry',
                viewpointId,
                elementIds: [elementId],
                activate: false,
            });
            setSelectedId(stableId);
            setCaptureId('__none__');
            inspectElement(elementId);
            setCreateScreenOpen(false);
            setScreenName('NewUIScreen');
            setStatus('UI screen created. Choose a capture asset or upload one.');
        } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error));
        }
    };

    const chooseCaptureAsset = async (capture: MemoElement) => {
        if (!screen) return setStatus('Create or select a UI screen first.');
        const ownerId = captureOwner.get(capture.id);
        if (ownerId && ownerId !== screen.id) {
            const owner = Object.values(model.elements).find(element => element.id === ownerId);
            return setStatus(`“${capture.name}” already depicts ${owner?.name ?? ownerId}; duplicate the asset before reassigning it.`);
        }
        try {
            if (!ownerId) await createLink('CapturesScreen', capture.id, screen.id);
            setCaptureId(capture.id);
            setAssetLibraryOpen(false);
            setStatus(`Using capture asset “${capture.name}”.`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error));
        }
    };

    const createRegion = async (bounds: Rect, options: {
        parentElementId?: string;
        automatic?: boolean;
        confidence?: number;
        name?: string;
    } = {}): Promise<string | undefined> => {
        if (!screen) {
            setStatus('Add or capture a screen before drawing regions.');
            return undefined;
        }
        setStatus('Saving region…');
        try {
            const stableId = nextUiElementId(uiElements);
            const id = usageIdentifier(stableId, 'uiElement', uiElements);
            createModelElement({
                id,
                name: options.name?.trim() || `Region ${stableId}`,
                kind: 'UIElement',
                construct: 'part',
                layer: screen.layer,
                file: screen.file || 'model/generated.sysml',
                doc: '',
                attributes: {
                    id: stableId,
                    ...boundsAttributes(bounds),
                    formKind: 'UIElementFormKind::panel',
                    disclosureKind: 'UIDisclosureKind::inline',
                    detectionMethod: options.automatic ? 'BoundsDetectionKind::automaticConfirmed' : 'BoundsDetectionKind::manual',
                    ...(options.confidence !== undefined ? { detectionConfidence: String(Number(options.confidence.toFixed(3))) } : {}),
                    ...(options.automatic ? { confirmedBy: 'currentReviewer', confirmedAt: new Date().toISOString() } : {}),
                    boundaryColor: '#14B8A6',
                    boundaryOpacity: '0.12',
                },
            });
            await waitForElement(id, useModelStore.getState().model?.elements[id]);
            await createLink('Composes', options.parentElementId ?? screen.id, id);
            setDrawMode(false);
            setStatus('Region saved.');
            return id;
        } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error));
            return undefined;
        }
    };

    const uploadCapture = async (file: File) => {
        if (!selected || !screen) return setStatus('Choose a geometry view with a screen before uploading.');
        setStatus('Saving capture…');
        try {
            const data = await fileData(file);
            const extension = file.name.toLowerCase().split('.').pop();
            const mediaType = (file.type || (extension === 'png'
                ? 'image/png'
                : extension === 'webp'
                    ? 'image/webp'
                    : extension === 'jpg' || extension === 'jpeg'
                        ? 'image/jpeg'
                        : '')) as 'image/png' | 'image/jpeg' | 'image/webp';
            if (!mediaType) throw new Error('Choose a PNG, JPEG, or WebP capture.');
            const saved = await requestScreenCaptureUpload({
                viewName: selected.name,
                fileName: file.name,
                base64: data.base64,
                mediaType,
            });
            if (!saved.success || !saved.imageUri || !saved.imageHash) throw new Error(saved.error || 'Capture upload failed.');
            const stableId = nextUiAssetId(captures);
            const id = createModelElement({
                id: usageIdentifier(stableId, 'uiAsset', captures),
                name: `${screen.name} capture`,
                kind: 'ScreenCapture',
                construct: 'part',
                layer: screen.layer,
                file: screen.file || 'model/generated.sysml',
                doc: '',
                attributes: {
                    id: stableId,
                    imageUri: saved.imageUri,
                    imageHash: saved.imageHash,
                    pixelWidth: String(data.width),
                    pixelHeight: String(data.height),
                    capturedBuild: build.trim(),
                    captureContext: selected.name,
                },
            });
            await waitForElement(id, useModelStore.getState().model?.elements[id]);
            await createLink('CapturesScreen', id, screen.id);
            // Normalized bounds migrate to a new capture. Automatically detected
            // regions must be reviewed again; manual regions keep their disposition.
            for (const element of uiElements) {
                if (element.attributes.detectionMethod?.endsWith('automatic')) {
                    persistElementAttributes(element.id, { confirmedBy: '', confirmedAt: '' });
                }
            }
            setCaptureId(id);
            setStatus('Capture saved; automatic regions require confirmation.');
        } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error));
        }
    };

    const detectRegions = async () => {
        if (!scene.imageUri) return setStatus('Attach a screen-capture asset before detecting regions.');
        setStatus('Detecting nested boundaries…');
        try {
            const detected = await detectBoundariesFromImage(scene.imageUri);
            const next = detected.map((candidate, index): ScreenRegionProposal => ({
                id: `proposal-${index + 1}`,
                bounds: candidate.bounds,
                confidence: candidate.confidence,
                parentId: candidate.parentIndex !== undefined ? `proposal-${candidate.parentIndex + 1}` : undefined,
                status: 'pending',
            }));
            proposalElementIds.current.clear();
            setProposals(next);
            setStatus(next.length
                ? `${next.length} boundary proposal${next.length === 1 ? '' : 's'} found. Accept or reject each box.`
                : 'No strong rectangular boundaries were detected; draw regions manually.');
        } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error));
        }
    };

    const acceptProposal = async (proposalId: string): Promise<string | undefined> => {
        const existing = proposalElementIds.current.get(proposalId);
        if (existing) return existing;
        const proposal = proposals.find(candidate => candidate.id === proposalId);
        if (!proposal || proposal.status === 'rejected') return undefined;
        let parentElementId: string | undefined;
        let authoredBounds = proposal.bounds;
        if (proposal.parentId) {
            const parent = proposals.find(candidate => candidate.id === proposal.parentId);
            if (parent && parent.status !== 'rejected') {
                parentElementId = await acceptProposal(parent.id);
                if (parentElementId) authoredBounds = relativeRect(proposal.bounds, parent.bounds);
            }
        }
        const elementId = await createRegion(authoredBounds, {
            parentElementId,
            automatic: true,
            confidence: proposal.confidence,
        });
        if (elementId) {
            proposalElementIds.current.set(proposalId, elementId);
            setProposals(current => current.map(candidate =>
                candidate.id === proposalId ? { ...candidate, status: 'accepted' } : candidate));
        }
        return elementId;
    };

    const rejectProposal = (proposalId: string) => {
        const rejected = new Set<string>([proposalId]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const proposal of proposals) {
                if (proposal.parentId && rejected.has(proposal.parentId) && !rejected.has(proposal.id)) {
                    rejected.add(proposal.id); changed = true;
                }
            }
        }
        setProposals(current => current.map(proposal =>
            rejected.has(proposal.id) ? { ...proposal, status: 'rejected' } : proposal));
        setStatus(`Rejected ${rejected.size} proposal${rejected.size === 1 ? '' : 's'}.`);
    };

    return (
        <div className="flex flex-1 min-h-0" style={{ background: '#F7F7F5' }}>
            <aside style={{ width: 250, flexShrink: 0, borderRight: '1px solid #E5E5E0', background: '#FFFFFF', padding: '16px 12px', overflowY: 'auto' }}>
                <div className="flex items-center" style={{ margin: '0 8px 4px' }}>
                    <h1 style={{ margin: 0, flex: 1, color: '#1B3A4B', fontSize: 18, fontWeight: 700 }}>UI Screens</h1>
                    <IconButton icon={<Icon.plus />} ariaLabel="Add UI element" title="Create a root UIElement screen"
                        onClick={() => setCreateScreenOpen(open => !open)} active={createScreenOpen} />
                </div>
                <p style={{ margin: '0 8px 16px', color: '#6B7280', fontSize: 12 }}>Capture, mark up, and trace screen regions.</p>
                {createScreenOpen && (
                    <div style={{ margin: '0 4px 12px', padding: 10, background: '#F7F7F5', border: '1px solid #E5E5E0', borderRadius: 8 }}>
                        <label style={{ display: 'block', color: '#6B7280', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>UI ELEMENT NAME</label>
                        <input aria-label="New UI screen name" value={screenName} onChange={event => setScreenName(event.target.value)}
                            onKeyDown={event => { if (event.key === 'Enter') void createRootScreen(); }}
                            style={{ width: '100%', border: '1px solid #D8D8D2', borderRadius: 6, padding: '6px 8px', fontSize: 12 }} />
                        <div className="flex gap-2" style={{ marginTop: 8 }}>
                            <button onClick={() => void createRootScreen()} disabled={!screenName.trim()} style={{
                                flex: 1, border: 0, borderRadius: 6, padding: '5px 8px', background: '#1B3A4B', color: '#FFFFFF', fontSize: 11, cursor: 'pointer',
                            }}>Create screen</button>
                            <button onClick={() => setCreateScreenOpen(false)} style={{
                                border: '1px solid #D8D8D2', borderRadius: 6, padding: '5px 8px', background: '#FFFFFF', color: '#4B5563', fontSize: 11, cursor: 'pointer',
                            }}>Cancel</button>
                        </div>
                    </div>
                )}
                <div role="tree" aria-label="UI screen hierarchy">
                {layouts.map(layout => {
                    const screenElement = screenForLayout(layout, screens)
                        ?? screens.find(candidate => captureForScreen(model, candidate.id)?.attributes.captureContext === layout.name);
                    if (!screenElement) return null;
                    const screenKey = `screen:${screenElement.id}`;
                    const regions = composedChildren.get(screenElement.id) ?? [];
                    return <div key={layout.id} role="none" style={{ marginBottom: 4 }}>
                        <ExplorerTreeRow id={screenKey} label={screenElement.name} depth={0} hasChildren={regions.length > 0} expanded={!collapsedTree.has(screenKey)}
                            selected={screenElement.id === selectedElementId} badge="UIE" badgeColor="#0F766E" title="Root UIElement screen"
                            onClick={() => { if (regions.length) toggleTree(screenKey); selectLayout(layout.id, screenElement, screenElement); }}
                            onDelete={() => deleteModelElement(screenElement.id)} />
                        {!collapsedTree.has(screenKey) && <div role="group">
                            {regions.map(child => renderRegionBranch(child, layout.id, screenElement, 1))}
                        </div>}
                    </div>;
                })}
                </div>
            </aside>
            <main className="flex-1 flex flex-col min-w-0 relative">
                {selected ? (
                    <>
                        <div className="flex items-center px-3 py-2" style={{
                            minHeight: 48, background: '#F7F7F5', borderBottom: '1px solid #E5E5E0',
                        }}>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
                              width: 'fit-content', maxWidth: '100%', background: '#FFFFFF', border: '1px solid #E5E5E0',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          }}>
                            <span title="Choose the independent capture asset used as the canvas backdrop"><Icon.capture /></span>
                            <select aria-label="Attached screen capture" value={captureId ?? '__none__'} onChange={e => setCaptureId(e.target.value)}
                                className="text-xs font-semibold rounded-lg px-2 py-1" style={{ color: '#5B6470', background: '#FFFFFF', border: '1px solid #E2E1DB', maxWidth: 220 }}>
                                {linkedCaptures.length === 0 && <option value="__none__">No capture attached</option>}
                                {linkedCaptures.map(capture => <option key={capture.id} value={capture.id}>{capture.name}</option>)}
                            </select>
                            <IconButton icon={<Icon.info />} onClick={() => scene.capture && inspectElement(scene.capture.id)}
                                ariaLabel="Inspect capture asset" title="Open this ScreenCapture asset in Properties" />
                            <IconButton icon={<Icon.library />} label="Assets" active={assetLibraryOpen}
                                onClick={() => setAssetLibraryOpen(open => !open)} title="Choose a ScreenCapture from the asset library" />
                            <input aria-label="New capture asset build" value={build} onChange={e => setBuild(e.target.value)} placeholder="Asset build"
                                title="Software build that produced the new capture asset"
                                className="text-xs rounded-lg px-2 py-1" style={{ width: 112, color: '#5B6470', background: '#FFFFFF', border: '1px solid #E2E1DB' }} />
                            <ToolbarCluster>
                                <IconButton icon={<Icon.upload />} label="Add capture" onClick={() => uploadInputRef.current?.click()}
                                    title="Create a ScreenCapture asset from a PNG, JPEG, or WebP image" />
                            </ToolbarCluster>
                            <input ref={uploadInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                                onChange={e => e.target.files?.[0] && uploadCapture(e.target.files[0])} />
                            <ToolbarSep />
                            <IconToggle icon={<Icon.rectangle />} label={drawMode ? 'Cancel drawing' : 'Add region'} active={drawMode}
                                onClick={() => setDrawMode(value => !value)} title="Drag a rectangle, then edit the region in Properties" />
                            <IconToggle icon={<Icon.detect />} label="Detect" active={proposals.some(proposal => proposal.status === 'pending')}
                                badge={proposals.filter(proposal => proposal.status === 'pending').length || undefined}
                                onClick={() => void detectRegions()} title="Propose nested regions from detected image boundaries" />
                            {status && <span role="status" className="truncate" style={{ marginLeft: 'auto', fontSize: FONT.xs, color: '#6B7280', maxWidth: 180 }}>{status}</span>}
                          </div>
                        </div>
                        {captureId === '__none__' ? (
                            <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#F7F7F5' }}>
                                <div style={{ width: 'min(560px, 100%)', padding: 28, textAlign: 'center', background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 14, boxShadow: '0 4px 18px rgba(15,23,42,0.06)' }}>
                                    <div style={{ display: 'inline-flex', padding: 12, borderRadius: 12, background: '#E1F5EE', color: '#0F766E' }}><Icon.capture size={28} /></div>
                                    <h2 style={{ margin: '14px 0 6px', color: '#1B3A4B', fontSize: 18, fontWeight: 700 }}>Add a visual asset to {screen?.name}</h2>
                                    <p style={{ margin: '0 auto 18px', maxWidth: 430, color: '#6B7280', fontSize: 12, lineHeight: 1.5 }}>
                                        Upload a new screen capture or link an existing ScreenCapture from the asset library. The asset remains independent and is connected through CapturesScreen.
                                    </p>
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => uploadInputRef.current?.click()} className="flex items-center gap-2" style={{
                                            padding: '8px 13px', border: 0, borderRadius: 8, background: '#1B3A4B', color: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        }}><Icon.upload /> Upload screen capture</button>
                                        <button onClick={() => setAssetLibraryOpen(true)} className="flex items-center gap-2" style={{
                                            padding: '8px 13px', border: '1px solid #D8D8D2', borderRadius: 8, background: '#FFFFFF', color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        }}><Icon.library /> Choose from asset library</button>
                                    </div>
                                    <p style={{ margin: '14px 0 0', color: '#9CA3AF', fontSize: 10 }}>You can also create the CapturesScreen relationship later in Properties.</p>
                                </div>
                            </div>
                        ) : (
                            <ScreenLayoutView
                                diagram={selected}
                                model={model}
                                captureId={captureId}
                                editable
                                drawMode={drawMode}
                                newElementDefaultName={`Region ${nextUiElementId(uiElements)}`}
                                proposals={proposals}
                                onAcceptProposal={id => void acceptProposal(id)}
                                onRejectProposal={rejectProposal}
                                onCreateBounds={(bounds, name) => void createRegion(bounds, { name })}
                                onBoundsChange={(id, bounds) => persistElementAttributes(id, boundsAttributes(bounds))}
                            />
                        )}
                        {assetLibraryOpen && (
                            <div className="absolute inset-0 flex items-start justify-center" onMouseDown={event => { if (event.target === event.currentTarget) setAssetLibraryOpen(false); }} style={{
                                zIndex: 50, paddingTop: 70, background: '#0F172A33', backdropFilter: 'blur(1px)',
                            }}>
                                <div role="dialog" aria-label="ScreenCapture asset library" style={{
                                    width: 'min(720px, calc(100% - 40px))', maxHeight: 'calc(100% - 100px)', overflowY: 'auto',
                                    background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 12, boxShadow: '0 18px 50px rgba(15,23,42,0.22)',
                                }}>
                                    <div className="flex items-center" style={{ position: 'sticky', top: 0, zIndex: 2, padding: '12px 14px', background: '#FFFFFF', borderBottom: '1px solid #E5E5E0' }}>
                                        <div style={{ flex: 1 }}><strong style={{ color: '#1B3A4B', fontSize: 14 }}>ScreenCapture asset library</strong><div style={{ color: '#6B7280', fontSize: 10 }}>Choose an unassigned asset or one already linked to this screen.</div></div>
                                        <button aria-label="Close asset library" onClick={() => setAssetLibraryOpen(false)} style={{ width: 28, height: 28, border: 0, borderRadius: 6, background: '#F0F0ED', color: '#4B5563', cursor: 'pointer' }}>×</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(205px, 1fr))', gap: 10, padding: 12 }}>
                                        {captures.length === 0 && <div style={{ gridColumn: '1 / -1', padding: 28, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>No capture assets yet. Upload the first capture.</div>}
                                        {captures.map(capture => {
                                            const ownerId = captureOwner.get(capture.id);
                                            const owner = ownerId ? Object.values(model.elements).find(element => element.id === ownerId) : undefined;
                                            const available = !ownerId || ownerId === screen?.id;
                                            return <button key={capture.id} disabled={!available} onClick={() => void chooseCaptureAsset(capture)} style={{
                                                display: 'block', minWidth: 0, padding: 0, overflow: 'hidden', textAlign: 'left',
                                                border: `1px solid ${capture.id === captureId ? '#2DD4A8' : '#E5E5E0'}`, borderRadius: 9,
                                                background: capture.id === captureId ? '#F0FDFA' : '#FFFFFF', color: available ? '#374151' : '#9CA3AF', cursor: available ? 'pointer' : 'not-allowed', opacity: available ? 1 : 0.58,
                                            }}>
                                                <div style={{ height: 118, background: '#F3F4F6', borderBottom: '1px solid #E5E5E0' }}>
                                                    {capture.attributes.imageUri
                                                        ? <img src={assetUri(capture.attributes.imageUri)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                        : <div className="flex items-center justify-center h-full"><Icon.capture size={28} /></div>}
                                                </div>
                                                <div style={{ padding: '8px 9px' }}>
                                                    <div className="truncate" style={{ fontSize: 11, fontWeight: 650 }}>{capture.name}</div>
                                                    <div className="truncate" style={{ fontSize: 10, marginTop: 3 }}>{owner ? `Depicts ${owner.name}` : 'Unassigned asset'}</div>
                                                    {capture.attributes.capturedBuild && <div className="truncate" style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>{capture.attributes.capturedBuild}</div>}
                                                </div>
                                            </button>;
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center" style={{ color: '#6B7280', textAlign: 'center' }}>
                        <div><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><MemoBrandMark size={190} /></div><h2 style={{ color: '#374151', fontSize: 18 }}>No screen-layout views</h2><p>Add a MemoScreenLayoutView to begin.</p></div>
                    </div>
                )}
            </main>
        </div>
    );
}
