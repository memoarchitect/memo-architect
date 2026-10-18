# Session 1 IBD browser baseline

From this Architect checkout within memo-meta, use the existing sibling workspace
dependency links (tools → ../memo-tools, ontology → ../memo), install dependencies
with `pnpm install`, rebuild
sibling memo-tools (`PATH="$HOME/.local/bin:$PATH" pnpm build`), and build Architect CLI with `pnpm build:cli` if `lib/bin/memo-architect.js`
is absent. Install the browser once with `pnpm exec playwright install chromium`. Run:

```bash
MEMO_SYSIDE_PYTHON="$HOME/sandbox/ref/system-and-software-architecture/.syside-venv/bin/python" \
PATH="$HOME/.local/bin:$PATH" pnpm test:browser:ibd
```

The interpreter variable is a local setup example, not a hard-coded import. On
other machines supply a Python that imports SysIDE. The test server explicitly
selects SysIDE without changing user settings. It serves current web source and
compiled pilot tools. Ports default to 32117 and HMR 23217; override with
`MEMO_PILOT_PORT` and `MEMO_PILOT_HMR_PORT`. Occupied ports fail; servers are never
reused. Run serially. Each invocation allocates a timestamped artifact directory
and copies Vehicle source/sidecars there, excluding its runtime cache; its own
node_modules link resolves back to this checkout. Tests never edit the review
fixture or seed the app store. Component fixture reads expose geometry only.

Known contract failures are ordinary red assertions, not expected-failure marks.
An exit status of 1 is the current regression baseline, not acceptance. Screenshots,
SVG elements/path strings, DOM snapshots, runtime resolution, measurements, errors,
JSON report and Playwright traces live under `artifacts/ibd-baseline/<UTC run>/`.
`pnpm exec playwright show-trace <trace.zip>` opens a trace. No CI coverage claimed.

## Ownership map (current source, including dirty pilot work)

| State | Owners/writers | Boundaries and competing writes |
|---|---|---|
| Initial placement/size | `templates/interconnection-view.ts`, layout providers | Template supplies ELK footprint as `minWidth/minHeight` (1412–1413). Initial dimensions also become user resize limits. |
| Live node geometry | `DiagramCanvas.tsx`, React Flow `onNodesChange`, `InterconnectionNode.tsx` | `NodeResizer` invokes sibling predicate (580–600); proposal uses local coordinates against `positionAbsolute`. Gesture/port handlers and layout regeneration all touch geometry. |
| Ports | `InterconnectionNode.tsx` BoundaryPort; DiagramCanvas callbacks | 40-screen-pixel acquisition target, eight size zones, connect handles, labels, parent border resizer overlap. Move/size updates use separate callbacks. |
| Routes | DiagramCanvas planning/reroute/line edit; `InterconnectionEdge.tsx`; `ibd-routing.ts` | Diagram mode/type, per-edge manual flags and legacy points coexist. `reconnectRoute` retains interior points. Rendering paths are separate from stored points. |
| Selection/Properties | React Flow controlled selection; model-store inspector; DiagramCanvas node/edge callbacks | Local selection and inspector selection synchronize separately. Double-click inspects; explicit arrows navigate. Port double-click invokes owner callback. |
| Viewport | React Flow viewport, fit callbacks, wheel interception in DiagramCanvas | Pan/zoom also copied into sidecar during geometry save. Viewport is not isolated from persistence writes. |
| Undo | DiagramCanvas local command stacks | Geometry/settings handlers own their own transaction closures. Not a shared transaction protocol across engines. |
| Shared layout persistence | DiagramCanvas 350 ms effect (1186–1266), immediate setting/port/route writes, DiagramSurface renderer change | Geometry save requires manual placement and edit version. Several writers spread prior layout and then send full snapshots. Pending timer is cleared on dependency changes/unmount. |
| Native snapshots | JointJsCanvas `canvas.jointjs`, X6Canvas `canvas.x6`, maxGraph moved cells; notation-scene handoff | JointJS/X6 keep native geometry separate; maxGraph also writes shared node positions. Renderer changes write shared canvas settings and remount DiagramSurface canvas. |
| Wire/server/disk | `ws-client.ts` 991, tools `dev-server.ts` 1646, `view-layout-store.ts` | `diagram:layout:update` writes companion then broadcasts only to OTHER clients. Sender has no acknowledgement. Disk polling is baseline persistence evidence; not an application acknowledgement. |

## Capability evidence limits

Registry declarations are not browser verification. React Flow declares full editing,
undo, minimap and orthogonal routes; maxGraph declares manual layout/image export;
JointJS declares manual layout; X6 declares manual layout/orthogonal routes. Source
contains JointJS node/link inspection and move/route tools; X6 vertex/port/node
handlers and routing controls; maxGraph move/align persistence. These are source
observations until exercised. A renderer drawing successfully establishes only
rendering for this fixture, not edit parity, usable resizing, or save safety.

## Fixtures and measurement

`fixtures/vehicle-layout.yaml` freezes the dedicated review layout as read on
2026-10-13; it is copied only into each disposable fixture. The original sidecar
is never written. Source is the repository Vehicle example, inspired by GfSE but
original MEMO source. Nested geometry is authored in `packages/web/pilot-baseline/`
(two containment levels, negative absolute origin, separated siblings, synthetic
generated minimum and corner port). The component fixture exercises real resize
and hit-target code; it has no application routing/persistence controller.

`fixtures/performance-budgets.json` records provisional numeric budgets and
allowed variation. The MutationObserver/rAF probe measures input to a callback
after a changed style/path, **not raster paint**, and samples are not independent
gestures. Failed gestures cannot count as fast gestures. `performance-before-reload.json`
holds the usable raw data; the observer is destroyed by reload. `server.log`
holds model bootstrap time and disk saves. Cold bootstrap is not browser startup
latency. Planner frequency, graph remounts and leaked listeners remain unmeasured.
Budgets are deliverables for subsequent sessions, not proof of overall usability.

The server refuses tools/ontology links outside the sibling dedicated checkouts.
Renderer captures wait for actual JointJS/X6/React Flow nodes and two animation
frames; a visible control or a successful selectOption alone is not graph readiness.

## Session 2 ownership boundary

This table supersedes the competing-write notes above for the changed paths.
It specifies persistence ownership; it does not establish usable gestures.

| State | Owner and persisted representation | Boundary |
|---|---|---|
| Placement | Template/layout provider initially; part/port geometry handlers thereafter; shared nodes/ports and canvas.autoLayout | markManualLayout saves the placement setting immediately. Routing settings, line edits and tidy no longer call it. Geometry save retains automatic placement and leaves shared node entries unchanged when placement is automatic. |
| Routing type/mode | DiagramCanvas routing controller (X6 has its own controller); canvas.routingType/routingMode | withIbdRouting changes only these settings. Missing mode infers manual from legacy points; explicit automatic wins. No new schema. |
| Manual points | Edge gesture/undo controller; edges[id].points and existing landing fields | Geometry save replaces rendered edge entries, deliberately clearing points on automatic edges. Type/mode settings alone retain saved points; explicit automatic mode makes old points inactive. Endpoint reconnect retains authored interiors. |
| Selection | Controlled React Flow selection and inspector selection; native graph selection inside engine refs | Never copied into layout snapshots or layout undo. |
| Viewport | Mounted renderer camera; React Flow copies zoom/pan during geometry save | Routing-only saves preserve saved camera. Camera-only persistence was not added or accepted. |
| Native snapshots | JointJS canvas.jointjs; X6 canvas.x6; maxGraph uses shared node geometry | Plain geometry DTOs only. mergeNativeEntries preserves opaque object-entry fields/off-screen entries, replacing complete arrays. Each writer retains other namespaces. Graph/Paper/X6 instances stay in component refs, outside diagramLayouts. |
| Comparison handoff | diagram-renderer-selection module, mount-scoped callback | Scene data lives outside shared document state; no native graph object is added to the schema. |
| Persistence observation | ws-client / LayoutSaveObservation; tools dev-server / saveViewLayout | Optional requestId; diagram:layout:saved sent after synchronous write/removal completes. getDiagramLayoutSaveObservation reports pending/saved/failed for the latest sent request. Sending is pending, not acknowledgement. |

mergeRenderedLayout preserves unrelated top-level fields, off-screen node/edge/
annotation entries and canvas namespaces. Individual rendered entries preserve
their unknown fields at the writer; saved ports now also retain non-visible
entries. Existing withContextChildCoordinates and loader coordinate migration
remain in use. Unknown settings/top-level layout fields count as non-default
overrides in the store, so settings-only files are retained.

Save replies confirm successful file operations, including deliberate default
removal; they do not promise fsync, server revision arbitration, disconnected
delivery, retry UI, or flush-on-unmount. Older replies cannot settle the newest
request. Echo protection is connection-local: while pending/failed it preserves
the local draft; after completion it rejects the initial loaded and last 32 sent
older snapshot values. A previously sent identical snapshot cannot be
distinguished from an intentional remote revert. Arbitrary multi-client edits,
server restart/reconnect recovery and delayed/failed server writes remain later
session work. Tests simulate failure in the pure observer, not a real disk fault.

Run the ownership browser check separately with its own disposable seed:

```bash
MEMO_SESSION2_FIXTURE=1 MEMO_SYSIDE_PYTHON="$HOME/sandbox/ref/system-and-software-architecture/.syside-venv/bin/python" PATH="$HOME/.local/bin:$PATH" pnpm test:browser:ibd ownership.spec.ts
```

The environment flag selects ownership.spec.ts; the default command selects
baseline.spec.ts. Both allocate their own artifact directory/server/fixture.
The Session 2 seed adds opaque test fields and autoLayout:true only in that
copy, before startup. Browser edits use ordinary controls, then observe actual
server replies and disk data. Replay injection re-delivers old save replies,
sent snapshots, and the initial snapshot without editing disk or app stores.
The test verifies routing-only persistence, placement-only persistence, native/
unknown retention and reload; it does not exercise native edit parity.


## Latest-main integration (Session 7)

The historical `fixtures/vehicle-layout.yaml` remains a frozen input. Server
setup converts it into `@MemoLayout*` metadata in the declaring views of a fresh
disposable copy, then removes that copy's sidecar. Assertions observe the actual
`views.sysml` on disk through the server's layout reader. Production persistence
uses declared views only; it creates no companion layout files. Renderer
namespaces and forward-compatible fields use `MemoLayoutExtension` JSON;
standard geometry stays in typed metadata and camera state is not persisted.
The older sidecar descriptions above describe the retained pre-integration runs.

The native suite boots the ordinary app before collecting transformed-source
manifests, with the same source-request timeout. Failure artifacts include model
publications and pointer recipients. It reacquires the current header before its
first drag and asserts the actual down recipient; geometry/remount/save/history
assertions remain unchanged. No performance acceptance follows from these runs.

The routing and movement servers generate their current instrumented copies
from tracked source automatically. A fresh checkout needs no retained Session 5
artifacts for those current-source gates. The historical control is explicit:
`MEMO_UNDO_VARIANT=before` requires the retained frozen source snapshots; missing
snapshots fail setup rather than substituting the current implementation.
