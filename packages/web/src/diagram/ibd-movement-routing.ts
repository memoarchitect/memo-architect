import type { Node } from '@xyflow/react';
import type { MovementGeometry } from './movement-history';
import type { OrthogonalRouteRequest, RouteObstacle, RoutePoint } from '../views/orthogonal-router';

/** Strict body intersection, including authored diagonal segments. Touching a
 * boundary does not by itself replace a connector's authored route. */
export function routeEntersBody(points: RoutePoint[], box: RouteObstacle): boolean {
    return points.slice(1).some((b, i) => {
        const a = points[i]; let lo = 0, hi = 1;
        for (const [start, delta, min, max] of [
            [a.x, b.x-a.x, box.x+1e-6, box.x+box.width-1e-6],
            [a.y, b.y-a.y, box.y+1e-6, box.y+box.height-1e-6],
        ]) {
            if (Math.abs(delta) < 1e-9) { if (start < min || start > max) return false; }
            else { const p=(min-start)/delta, q=(max-start)/delta; lo=Math.max(lo,Math.min(p,q)); hi=Math.min(hi,Math.max(p,q)); }
        }
        return hi > lo + 1e-9;
    });
}

/** Incident endpoints include every descendant's world motion. An otherwise
 * stationary authored connector is affected if a moved or resized body now blocks it. */
export function affectedMovementRoutes(
    requests: OrthogonalRouteRequest[], nodes: Node[], before: MovementGeometry,
): Set<string> {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const oldNodes = new Map(before.nodes.map(node => [node.id, node]));
    const oldEdges = new Map(before.edges.map(edge => [edge.id, edge.data]));
    const absolute = (id: string, old: boolean): RoutePoint => {
        const node = byId.get(id)!;
        const position = old ? oldNodes.get(id)?.position ?? node.position : node.position;
        const parent = node.parentId ? absolute(node.parentId, old) : { x: 0, y: 0 };
        return { x: position.x + parent.x, y: position.y + parent.y };
    };
    const moved: RouteObstacle[] = nodes.flatMap(node => {
        if (node.hidden || node.data.isFrame || node.type === 'annotationNode') return [];
        const a=absolute(node.id,true), b=absolute(node.id,false);
        const old = oldNodes.get(node.id);
        const width = Number(node.width ?? node.style?.width ?? node.measured?.width);
        const height = Number(node.height ?? node.style?.height ?? node.measured?.height);
        const oldWidth = Number(old?.width ?? old?.styleWidth ?? old?.measured?.width);
        const oldHeight = Number(old?.height ?? old?.styleHeight ?? old?.measured?.height);
        if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return [];
        if (Math.abs(a.x-b.x)<1e-8 && Math.abs(a.y-b.y)<1e-8
            && Math.abs(width-oldWidth)<1e-8 && Math.abs(height-oldHeight)<1e-8) return [];
        return [{ id:node.id, ...b, width, height }];
    });
    const near = (a:RoutePoint,b:RoutePoint) => Math.abs(a.x-b.x)<1e-8 && Math.abs(a.y-b.y)<1e-8;
    return new Set(requests.filter(request => {
        const old=oldEdges.get(request.id), points=old?.points as RoutePoint[]|undefined;
        if (!points?.length || !near(points[0],request.source) || !near(points[points.length-1],request.target)
            || old?.sourceSide !== request.sourceSide || old?.targetSide !== request.targetSide) return true;
        const ancestors = new Set([
            ...(request.sourceAncestorIds??[]),...(request.targetAncestorIds??[])]);
        return moved.some(box => !ancestors.has(box.id) && routeEntersBody(points,box));
    }).map(request => request.id));
}
