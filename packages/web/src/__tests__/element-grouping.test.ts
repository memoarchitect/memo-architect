import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO, ViewpointDTO } from '@memoarchitect/tools/browser';
import { declarationPath, groupParentPath, siblingGroups } from '../lib/element-package';
import { groupUiChildren } from '../views/UiScreensWorkspace';
import { buildDefinitionTree, buildViewpointTree } from '../components/ExplorerPanel';

const element = (id: string, extra: Partial<MemoElement> = {}): MemoElement => ({
    id, name: id, kind: 'UIElement', construct: 'part', layer: 'implementation',
    file: 'model/ui.sysml', package: 'Ui', attributes: {}, ...extra,
});

const screen = element('scrHome');
const back = element('btnBack', { owner: 'scrHome', attributes: { elementPackage: 'grpHeader' } });
const close = element('btnClose', { owner: 'scrHome', attributes: { elementPackage: 'grpHeader' } });
const footer = element('lblFooter', { owner: 'scrHome' });
const model = {
    elements: Object.fromEntries([screen, back, close, footer].map(el => [el.id, el])),
} as unknown as MemoModelDTO;

describe('addressing a grouping package', () => {
    it('names a nested declaration by the path that reaches it', () => {
        expect(declarationPath(model, back)).toBe('Ui::scrHome::btnBack');
        expect(declarationPath(model, screen)).toBe('Ui::scrHome');
    });

    it('puts a new group beside the element, inside its owner', () => {
        // Inside the owner, not inside the element: "these buttons are the
        // header" is a claim about the screen's members.
        expect(groupParentPath(model, back)).toBe('Ui::scrHome');
        // An element with no owner is declared in a namespace package already.
        expect(groupParentPath(model, screen)).toBe('Ui');
    });

    it('offers the groups that already exist beside it', () => {
        expect(siblingGroups(model, footer)).toEqual(['grpHeader']);
    });
});

describe('grouping a screen tree', () => {
    it('collects members under the package that labels them, in declaration order', () => {
        const { groups, ungrouped } = groupUiChildren([back, footer, close]);
        expect(groups).toEqual([{ name: 'grpHeader', members: [back, close] }]);
        expect(ungrouped).toEqual([footer]);
    });

    it('leaves an ungrouped tree exactly as it was', () => {
        expect(groupUiChildren([footer])).toEqual({ groups: [], ungrouped: [footer] });
    });
});

const viewpoint = (id: string, parentId?: string): ViewpointDTO => ({
    id, label: id, visibleKinds: [], visibleRelationships: [], visibleLayers: [],
    ...(parentId ? { parentId } : {}),
});

describe('nesting viewpoints', () => {
    it('files a viewpoint under the viewpoint that frames it', () => {
        const tree = buildViewpointTree([viewpoint('vpSoS'), viewpoint('vpPump', 'vpSoS'), viewpoint('vpRisk')]);
        expect(tree.rootViewpoints.map(vp => vp.id)).toEqual(['vpSoS', 'vpRisk']);
        expect(tree.viewpointChildren.get('vpSoS')?.map(vp => vp.id)).toEqual(['vpPump']);
    });

    it('keeps a viewpoint whose parent is absent, as a root', () => {
        const tree = buildViewpointTree([viewpoint('vpPump', 'vpMissing')]);
        expect(tree.rootViewpoints.map(vp => vp.id)).toEqual(['vpPump']);
    });

    it('does not lose a viewpoint to a cycle', () => {
        const tree = buildViewpointTree([viewpoint('a', 'b'), viewpoint('b', 'a'), viewpoint('c', 'c')]);
        expect(tree.rootViewpoints.map(vp => vp.id).sort()).toEqual(['a', 'b', 'c']);
    });
});

const action = (id: string, kind: string, extra: Partial<MemoElement> = {}): MemoElement => ({
    id, name: id, kind, construct: 'action', layer: 'behavior',
    file: 'model/fn.sysml', package: 'Fn', attributes: {}, ...extra,
});

describe('the definitions a model declares', () => {
    const definition = action('AcquireSensorData', 'ActionDefinition');
    const usage = action('acquireSensors', 'AcquireSensorData');
    const otherUsage = action('acquireBackup', 'AcquireSensorData');
    const unused = action('EvaluateAlarms', 'ActionDefinition');
    // A usage of an ONTOLOGY kind has no local definition to sit under.
    const ontologyUsage = action('logEvent', 'SystemFunction');

    it('lists each definition with the usages that name it', () => {
        const tree = buildDefinitionTree([definition, usage, otherUsage, ontologyUsage]);
        expect(tree).toEqual([{
            layer: 'behavior',
            definitions: [{ definition, usages: [otherUsage, usage] }],
        }]);
    });

    it('keeps a definition nothing uses — that is the finding', () => {
        const tree = buildDefinitionTree([definition, usage, unused]);
        expect(tree[0].definitions.map(entry => entry.definition.id)).toEqual(['AcquireSensorData', 'EvaluateAlarms']);
        expect(tree[0].definitions[1].usages).toEqual([]);
    });

    it('matches a search against the definition and against its usages', () => {
        expect(buildDefinitionTree([definition, usage], 'acquireSensors')[0].definitions).toHaveLength(1);
        expect(buildDefinitionTree([definition, usage], 'nothing')).toEqual([]);
    });

    it('is empty for a model that declares no definitions of its own', () => {
        expect(buildDefinitionTree([ontologyUsage])).toEqual([]);
    });
});
