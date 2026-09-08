// Ported from the affera bundle patch's rule tests. They are the reason the
// behaviour is portable at all: every rule here is pure geometry, so the whole
// contract can be held down without a canvas.
import { describe, it, expect } from 'vitest';
import {
    SIBLING_GUTTER, TITLE_BAND,
    shouldRunAutoLayout, shouldKeepManualRoute,
    partitionChildren, shouldPackPeerGrid, packPeerGrid,
    facingWall, assignFacingPorts,
    packHostColumns, packLayeredRight, arrangeSiblings,
    isHumanKind, isStakeholderKind, compassSide, parseContextSide,
    assertSiblingGutters, portInTitleBand,
    contextCategory, straightSpokes, spokeLabelPoints, spokesCross,
} from '../layout-rules';
import { balancedGridColumns } from '../../layout';

const box = (id: string, x: number, y: number, w: number, h: number) =>
    ({ id, x, y, width: w, height: h });

/** `assert.equal` is loose; these keep the ported assertions readable. */
const expectEqual = (actual: unknown, expected: unknown) => expect(actual).toBe(expected);
const expectDeep = (actual: unknown, expected: unknown) => expect(actual).toEqual(expected);

describe('autoLayout / manualRoute contracts', () => {
  it('does not move nodes when autoLayout is false', () => {
    expectEqual(shouldRunAutoLayout({ autoLayout: false }), false);
    expectEqual(shouldRunAutoLayout({ autoLayout: true }), true);
    expectEqual(shouldRunAutoLayout({}), true);
    expectEqual(shouldRunAutoLayout(undefined), true);
  });

  it('does not replace edges[id].points when manualRoute is true', () => {
    expectEqual(shouldKeepManualRoute({ manualRoute: true, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }), true);
    expectEqual(shouldKeepManualRoute({ manualRoute: false, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }), false);
    expectEqual(shouldKeepManualRoute({}), false);
  });
});

describe('2×2 peer grid (pump pub/sub shape)', () => {
  it('packs four unconnected ported siblings as a 2×2 grid, not a column', () => {
    const nodes = ['a', 'b', 'c', 'd'].map((id) => ({ id, width: 180, height: 90 }));
    expectEqual(shouldPackPeerGrid(nodes.map((n) => n.id), []), true);
    expectEqual(shouldPackPeerGrid(nodes.map((n) => n.id), [{ source: 'a', target: 'framePort' }]), true);
    const layout = packPeerGrid(nodes);
    expectEqual(layout.cols, 2);
    expectEqual(layout.rows, 2);
    const xs = new Set(layout.children.map((c) => c.x));
    const ys = new Set(layout.children.map((c) => c.y));
    expectEqual(xs.size, 2);
    expectEqual(ys.size, 2);
    assertSiblingGutters(layout.children);
  });

  it('does not grid-pack when children exchange with each other', () => {
    expectEqual(shouldPackPeerGrid(['a', 'b'], [{ source: 'a', target: 'b' }]), false);
  });
});

describe('two-column host IBD (pacing shape)', () => {
  it('places Workstation left and CIU right when host is known', () => {
    const nodes = [
      { id: 'viewer', host: 'ws', width: 200, height: 80 },
      { id: 'case_manager', host: 'ws', width: 200, height: 80 },
      { id: 'main_acq', host: 'ciu', width: 200, height: 80 },
      { id: 'peaks', host: 'ciu', width: 200, height: 80 },
      { id: 'db', host: 'ciu', width: 200, height: 80 },
    ];
    const layout = packHostColumns(nodes);
    expectEqual(layout.strategy, 'host-columns');
    const viewer = layout.children.find((c) => c.id === 'viewer');
    const main = layout.children.find((c) => c.id === 'main_acq');
    expect(viewer.x + viewer.width + SIBLING_GUTTER <= main.x + 1).toBe(true);
    expectEqual(layout.children.filter((c) => c.x === viewer.x).length, 2);
    expectEqual(layout.children.filter((c) => c.x === main.x).length, 3);
    assertSiblingGutters(layout.children);
  });

  it('falls back to left-to-right layers when host is unknown', () => {
    const nodes = ['viewer', 'main_acq', 'peaks'].map((id) => ({ id, width: 180, height: 70 }));
    const layout = packLayeredRight(nodes, [
      { source: 'viewer', target: 'main_acq' },
      { source: 'main_acq', target: 'peaks' },
    ]);
    const viewer = layout.children.find((c) => c.id === 'viewer');
    const peaks = layout.children.find((c) => c.id === 'peaks');
    expect(viewer.x < peaks.x).toBe(true);
    expectEqual(new Set(layout.children.map((c) => c.x)).size, 3);
  });
});

describe('facing ports on a nested IBD miniature', () => {
  it('puts partner ports on facing walls and keeps them out of the title band', () => {
    const parent = box('enclosure', 0, 0, 640, 360);
    const a = box('fpga', 80, 80, 160, 120);
    const b = box('rf', 360, 80, 160, 120);
    const c = box('cqm', 360, 240, 160, 80);
    expectEqual(facingWall(a, b), 'right');
    expectEqual(facingWall(b, a), 'left');
    expectEqual(facingWall(b, c), 'bottom');
    const sides = assignFacingPorts([a, b, c], [
      { source: 'fpga', target: 'rf', sourcePort: 'rfOut', targetPort: 'rfIn' },
      { source: 'fpga', target: 'cqm', sourcePort: 'cqmOut', targetPort: 'cqmIn' },
      { source: 'rf', target: 'cqm', sourcePort: 'monOut', targetPort: 'monIn' },
      { source: 'cqm', target: 'fpga', sourcePort: 'dataOut', targetPort: 'dataIn' },
    ]);
    expectEqual(sides.get('rfOut'), 'right');
    expectEqual(sides.get('rfIn'), 'left');
    expect(!portInTitleBand(TITLE_BAND, TITLE_BAND)).toBe(true);
    expect(portInTitleBand(20)).toBe(true);
    expect(!portInTitleBand(46)).toBe(true);
    expectEqual(parent.width > a.width, true);
  });
});

describe('context compass', () => {
  it('puts SoI center, humans left, devices right, stakeholders bottom', () => {
    const physician = { kind: 'AfferaPhysicianActor', name: 'EP Physician' };
    const stim = { kind: 'MemoPart', name: 'External Stimulator' };
    const stk = { kind: 'AfferaStakeholder', name: 'Manufacturer' };
    const env = { kind: 'UseContext', name: 'EP Lab' };
    expectEqual(isHumanKind(physician.kind), true);
    expectEqual(isStakeholderKind(stk.kind), true);
    expectEqual(compassSide(physician), 'left');
    expectEqual(compassSide(stim), 'right');
    expectEqual(compassSide(stk), 'bottom');
    expectEqual(compassSide(env), 'top');
    expectEqual(compassSide(physician, 'right'), 'right');
    expectEqual(parseContextSide("ContextSideKind::'actor'"), 'left');
    expectEqual(parseContextSide('ContextSideKind::externalSystem'), 'right');
  });

  it('does not require exact kind == User', () => {
    expectEqual(isHumanKind('User'), true);
    expectEqual(isHumanKind('Actor'), true);
    expectEqual(isHumanKind('AfferaMapperActor'), true);
    expectEqual(isHumanKind('AfferaEpPhysicianActor'), true);
    expectEqual(isHumanKind('MemoPart'), false);
  });

  it('does not treat device *Actor kinds as humans', () => {
    expectEqual(isHumanKind('AfferaHospitalEpRecordingSystemActor'), false);
    expectEqual(isHumanKind('AfferaCompatibleMappingAblationCatheterActor'), false);
    expectEqual(isHumanKind('AfferaReturnElectrodesActor'), false);
    expectEqual(isHumanKind('AfferaNonHumanActor'), false);
    expectEqual(isHumanKind('OperationalParticipant'), false);
  });

  it('tags glyphs from compass side, not from *Actor in the kind name', () => {
    expectEqual(contextCategory('left'), 'person');
    expectEqual(contextCategory('right'), 'system');
    expectEqual(contextCategory('bottom'), 'environment');
  });
});

describe('context straight spokes', () => {
  it('draws one segment per spoke; y-ordered left-column spokes do not cross', () => {
    const system = { x: 400, y: 200, width: 240, height: 120 };
    const drafts = [0, 1, 2, 3].map((i) => ({
      id: `e${i}`,
      source: { x: 80, y: 40 + i * 90 },
      target: { x: 400, y: 220 + i * 20 },
    }));
    const routes = straightSpokes(drafts);
    expectEqual(routes.get('e0').length, 2);
    for (let i = 0; i < drafts.length; i++) {
      for (let j = i + 1; j < drafts.length; j++) {
        expectEqual(spokesCross(drafts[i], drafts[j]), false);
      }
    }
    const labels = spokeLabelPoints(drafts, system);
    const mid0 = labels.get('e0');
    expect(mid0.x < (drafts[0].source.x + drafts[0].target.x) / 2 + 1).toBe(true);
  });
});

describe('partitionChildren (unchanged contract for nested containers)', () => {
  it('grid-packs only unconnected, portless leaves', () => {
    const { flowKids, orphanKids } = partitionChildren(
      ['a', 'b', 'nested', 'orphan'],
      {
        isConnected: (id) => ['a', 'b'].includes(id),
        hasChildParts: (id) => id === 'nested',
        portCount: (id) => (id === 'a' ? 1 : 0),
      },
    );
    expectDeep(orphanKids, ['orphan']);
    expectDeep(flowKids, ['a', 'b', 'nested']);
  });
});

describe('arrangeSiblings dispatcher', () => {
  it('prefers a peer grid, then host columns, then layered-right', () => {
    const four = ['a', 'b', 'c', 'd'].map((id) => ({ id, width: 100, height: 60 }));
    expectEqual(arrangeSiblings(four, []).strategy, 'peer-grid');
    const hosted = [
      { id: 'a', host: 'ws', width: 100, height: 60 },
      { id: 'b', host: 'ciu', width: 100, height: 60 },
    ];
    expectEqual(arrangeSiblings(hosted, [{ source: 'a', target: 'b' }]).strategy, 'host-columns');
    const chain = ['a', 'b', 'c'].map((id) => ({ id, width: 100, height: 60 }));
    expectEqual(arrangeSiblings(chain, [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }]).strategy, 'layered-right');
  });
});

describe('balancedGridColumns', () => {
  it('uses both axes for multi-part compositions', () => {
    expectEqual(balancedGridColumns(4), 2);
    expectEqual(balancedGridColumns(1), 1);
  });
});
