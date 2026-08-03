// Compatibility exports for maxGraph. The canonical scene lives in
// diagram/notation-scene and has no renderer dependency.
import { projectLayoutToNotationScene } from '../../notation-scene';
import type { NotationEdge, NotationLayoutEdge, NotationLayoutNode, NotationNode, NotationScene } from '../../notation-scene';

export type SceneNodeSpec = NotationNode;
export type SceneEdgeSpec = NotationEdge;
export type DiagramSceneSpec = NotationScene;

type FlowishNode = NotationLayoutNode;
type FlowishEdge = NotationLayoutEdge;

/** @deprecated Layouts should project through the notation scene directly. */
export function buildScene(nodes: readonly FlowishNode[], edges: readonly FlowishEdge[]): DiagramSceneSpec {
    return projectLayoutToNotationScene(nodes, edges);
}
