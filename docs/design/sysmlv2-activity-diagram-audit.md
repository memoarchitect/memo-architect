# SysML v2 activity-diagram audit

This audit uses `sysml-v2-activity-example.sysml` as the acceptance example.

## Supported by the activity-diagram renderer

| SysML v2 concept | Display |
| --- | --- |
| Action usage / action definition | Action card with typed in/out pins |
| Accept action usage | Action card labelled `«accept action»` |
| Send action usage | Action card labelled `«send action»` |
| Decision node | Diamond |
| Merge node | Diamond |
| Fork node | Synchronization bar |
| Join node | Synchronization bar |
| Initial node | Filled circle (derived from `start`) |
| Activity final / terminate action | Bullseye |
| Flow final | Circled X |
| Succession | Control-flow arrow; bracketed guard in `sourceEnd` is displayed |
| Flow connection | Typed item-flow arrow |

The renderer accepts both MEMO builder names (for example `ForkNode`) and common
SysML v2/importer names (for example `DecisionNodeUsage`, `AcceptActionUsage`,
and `ActivityFinalNodeUsage`).

## Parser and semantic-model gaps

Memo Architect receives its semantic model from `@memoarchitect/tools`. Its
currently bundled grammar recognizes generic actions, `fork`, `join`, flows,
and unguarded successions, but does **not** parse the following valid constructs
used by the supplied example:

| Source construct | Required upstream work |
| --- | --- |
| `decide routeOrder;` | Add decision-node usage and create `DecisionNodeUsage` |
| `merge afterDecision;` | Add merge-node usage and create `MergeNodeUsage` |
| `action receiveOrder accept ...;` | Add accept-action syntax and parameters/item binding |
| `then action sendReceipt send ...;` | Add send-action syntax and target binding |
| `then terminate;` | Add terminate action/final-node syntax |
| `first routeOrder if true then ...;` | Add guarded succession grammar and a `guard` field on `MemoRelationship` |

The view is intentionally forward-compatible with those elements, but the
parser work must be delivered in `@memoarchitect/tools` before this exact source
can be opened end-to-end in Memo Architect. Other advanced activity semantics
that still need model-level support are object-node pins/queues, parameter
nodes, streaming and continuous flows, rate/probability/weight constraints,
interruptible regions, exception handlers, and expansion regions.
