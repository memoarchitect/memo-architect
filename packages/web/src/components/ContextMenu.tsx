import { useEffect, useRef, useState } from 'react';
import type { MemoElement } from '@memo/core';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    // What was right-clicked?
    target?: {
        elementId?: string;
        kind?: string;         // right-clicked on a kind folder
        groupName?: string;    // right-clicked on a group folder
    };
    // Available groups for the target kind
    availableGroups?: string[];
    // Actions
    onCreateGroup?: (kind: string, groupName: string) => void;
    onMoveToGroup?: (elementId: string, groupName: string) => void;
    onRemoveFromGroup?: (elementId: string) => void;
    onAddTag?: (elementId: string, tag: string) => void;
    onRemoveTag?: (elementId: string, tag: string) => void;
    onDeleteGroup?: (kind: string, groupName: string) => void;
    onRenameGroup?: (kind: string, oldName: string, newName: string) => void;
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
    // Element data for context
    element?: MemoElement;
    elementTags?: string[];
}

export function ContextMenu({
    x, y, onClose, target,
    availableGroups = [],
    onCreateGroup, onMoveToGroup, onRemoveFromGroup,
    onAddTag, onRemoveTag, onDeleteGroup, onRenameGroup,
    onCollapseAll, onExpandAll,
    element, elementTags = [],
}: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [subMenu, setSubMenu] = useState<'move' | 'tag' | 'newGroup' | 'newTag' | 'rename' | null>(null);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Position adjustment
    const style: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 260),
        top: Math.min(y, window.innerHeight - 300),
        zIndex: 50,
        background: '#FFFFFF',
        border: '1px solid #E5E5E0',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: '4px 0',
        minWidth: '220px',
    };

    const MenuItem = ({ label, icon, onClick, danger, disabled }: {
        label: string; icon?: string; onClick: () => void; danger?: boolean; disabled?: boolean;
    }) => (
        <button
            className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors"
            style={{
                color: disabled ? '#D1D5DB' : danger ? '#DC2626' : '#374151',
                cursor: disabled ? 'default' : 'pointer',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? '#FEF2F2' : '#F0F0ED'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => { if (!disabled) onClick(); }}
            disabled={disabled}
        >
            {icon && <span className="w-4 text-center" style={{ opacity: 0.6 }}>{icon}</span>}
            <span className="flex-1">{label}</span>
        </button>
    );

    const Separator = () => <div style={{ borderTop: '1px solid #E5E5E0', margin: '4px 0' }} />;
    const SectionLabel = ({ label }: { label: string }) => (
        <div className="px-3 py-1 text-xs font-medium" style={{ color: '#9CA3AF' }}>{label}</div>
    );

    // ─── Inline input for new group / new tag / rename ───────────────
    if (subMenu === 'newGroup' || subMenu === 'newTag' || subMenu === 'rename') {
        const placeholder = subMenu === 'newGroup' ? 'Group name...'
            : subMenu === 'rename' ? 'New name...'
            : 'Tag name...';
        const handleSubmit = () => {
            if (!inputValue.trim()) return;
            if (subMenu === 'newGroup' && target?.kind && onCreateGroup) {
                onCreateGroup(target.kind, inputValue.trim());
            } else if (subMenu === 'newTag' && target?.elementId && onAddTag) {
                onAddTag(target.elementId, inputValue.trim());
            } else if (subMenu === 'rename' && target?.kind && target?.groupName && onRenameGroup) {
                onRenameGroup(target.kind, target.groupName, inputValue.trim());
            }
            onClose();
        };
        return (
            <div ref={ref} style={style}>
                <SectionLabel label={subMenu === 'newGroup' ? 'New Group' : subMenu === 'rename' ? 'Rename Group' : 'Add Tag'} />
                <div className="px-3 py-1.5 flex items-center gap-1.5">
                    <input
                        type="text"
                        placeholder={placeholder}
                        className="flex-1 text-xs px-2 py-1 rounded border focus:outline-none"
                        style={{ borderColor: '#2DD4A8', background: '#FAFAF8' }}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSubmit();
                            if (e.key === 'Escape') onClose();
                        }}
                        autoFocus
                    />
                    <button className="text-xs px-2 py-1 rounded font-medium"
                        style={{ background: '#2DD4A8', color: '#FFF' }}
                        onClick={handleSubmit}>
                        {subMenu === 'rename' ? 'Rename' : 'Add'}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Move to group submenu ───────────────────────────────────────
    if (subMenu === 'move') {
        return (
            <div ref={ref} style={style}>
                <SectionLabel label="Move to Group" />
                {availableGroups.map(g => (
                    <MenuItem key={g} label={g} icon={'\u2192'}
                        onClick={() => {
                            if (target?.elementId && onMoveToGroup) onMoveToGroup(target.elementId, g);
                            onClose();
                        }} />
                ))}
                {availableGroups.length === 0 && (
                    <div className="px-3 py-1.5 text-xs" style={{ color: '#D1D5DB', fontStyle: 'italic' }}>
                        No groups yet — create one first
                    </div>
                )}
                <Separator />
                <MenuItem label="New Group..." icon="+" onClick={() => { setSubMenu('newGroup'); setInputValue(''); }} />
                {element?.attributes['group'] && (
                    <MenuItem label="Remove from group" icon={'\u2715'} danger
                        onClick={() => {
                            if (target?.elementId && onRemoveFromGroup) onRemoveFromGroup(target.elementId);
                            onClose();
                        }} />
                )}
                <Separator />
                <MenuItem label="Back" icon={'\u2190'} onClick={() => setSubMenu(null)} />
            </div>
        );
    }

    // ─── Tag submenu ─────────────────────────────────────────────────
    if (subMenu === 'tag') {
        return (
            <div ref={ref} style={style}>
                <SectionLabel label="Tags" />
                {elementTags.length > 0 && (
                    <>
                        {elementTags.map(t => (
                            <div key={t} className="flex items-center px-3 py-1 text-xs gap-2">
                                <span className="px-1.5 py-0.5 rounded-full"
                                    style={{ background: '#2DD4A820', color: '#1B3A4B', fontSize: '10px' }}>{t}</span>
                                <span className="flex-1" />
                                <button style={{ color: '#DC2626', fontSize: '10px' }}
                                    onClick={() => {
                                        if (target?.elementId && onRemoveTag) onRemoveTag(target.elementId, t);
                                        onClose();
                                    }}>{'\u2715'}</button>
                            </div>
                        ))}
                        <Separator />
                    </>
                )}
                <MenuItem label="Add Tag..." icon="+" onClick={() => { setSubMenu('newTag'); setInputValue(''); }} />
                <Separator />
                <MenuItem label="Back" icon={'\u2190'} onClick={() => setSubMenu(null)} />
            </div>
        );
    }

    // ─── Main context menu ───────────────────────────────────────────
    return (
        <div ref={ref} style={style}>
            {/* Element-level actions */}
            {target?.elementId && (
                <>
                    <SectionLabel label={element?.name || 'Element'} />
                    <MenuItem label="Move to Group..." icon={'\u21B3'} onClick={() => setSubMenu('move')} />
                    <MenuItem label="Manage Tags..." icon={'\u2606'} onClick={() => setSubMenu('tag')} />
                    <Separator />
                </>
            )}

            {/* Kind folder actions */}
            {target?.kind && !target?.elementId && !target?.groupName && (
                <>
                    <SectionLabel label={target.kind} />
                    <MenuItem label="New Group..." icon="+" onClick={() => { setSubMenu('newGroup'); setInputValue(''); }} />
                    <Separator />
                </>
            )}

            {/* Group folder actions */}
            {target?.groupName && target?.kind && (
                <>
                    <SectionLabel label={target.groupName} />
                    <MenuItem label="Rename Group..." icon={'\u270E'} onClick={() => { setSubMenu('rename'); setInputValue(target.groupName || ''); }} />
                    <MenuItem label="Delete Group" icon={'\u2715'} danger
                        onClick={() => {
                            if (onDeleteGroup) onDeleteGroup(target.kind!, target.groupName!);
                            onClose();
                        }} />
                    <Separator />
                </>
            )}

            {/* Global actions */}
            <MenuItem label="Collapse All" icon={'\u229F'} onClick={() => { onCollapseAll?.(); onClose(); }} />
            <MenuItem label="Expand All" icon={'\u229E'} onClick={() => { onExpandAll?.(); onClose(); }} />
        </div>
    );
}
