// ─── Planning a board's connectors ───────────────────────────────────────────
//
// The planning steps that are slow on a large board, as pure functions of plain
// data, so the same code runs on the page or in the routing worker
// (`route-worker.ts`). Nothing here may import a module that touches the DOM.

import { routeEntersBody } from './ibd-movement-routing';
import {
    routeOrthogonalEdges, type OrthogonalRouteRequest, type RouteObstacle, type RoutePoint, type TidyRouteOptions,
} from '../views/orthogonal-router';

export type RouteQuality = 'direct' | 'tidy';

/**
 * Routes connectors clear of the ports that straddle each part's wall. Where
 * a corridor is too narrow for the clearance the ports need, the router falls
 * back to a line through a part; such connectors are routed again around the
 * bare parts, which beats crossing one.
 */
export function routeClearOfPorts(
    requests: OrthogonalRouteRequest[], clearOfPorts: RouteObstacle[], parts: RouteObstacle[],
    quality: RouteQuality, fixedRoutes: ReadonlyMap<string, RoutePoint[]>,
): Map<string, RoutePoint[]> {
    const options = quality === 'tidy' ? {} : { refineRounds: 0 };
    const routes = routeOrthogonalEdges(requests, clearOfPorts, 18, 'long-first', { ...options, fixedRoutes });
    const blocked = requests.filter(request => {
        if (fixedRoutes.has(request.id)) return false;
        const points = routes.get(request.id), allowed = new Set([...(request.sourceAncestorIds ?? []), ...(request.targetAncestorIds ?? [])]);
        return points && parts.some(part => !allowed.has(part.id) && routeEntersBody(points, part));
    });
    if (!blocked.length) return routes;
    const kept = new Map(fixedRoutes);
    for (const [id, points] of routes) if (!blocked.some(request => request.id === id)) kept.set(id, points);
    const retried = routeOrthogonalEdges(requests, parts, 18, 'long-first', { ...options, fixedRoutes: kept });
    for (const request of blocked) { const points = retried.get(request.id); if (points) routes.set(request.id, points); }
    return routes;
}

/** The planning steps the worker can be asked for, by name, with their arguments. */
export interface PlanningSteps {
    route: (
        requests: OrthogonalRouteRequest[], obstacles: RouteObstacle[], channelGap?: number,
        priority?: 'long-first' | 'short-first', options?: TidyRouteOptions,
    ) => Map<string, RoutePoint[]>;
    clearOfPorts: typeof routeClearOfPorts;
}

export const planningSteps: PlanningSteps = { route: routeOrthogonalEdges, clearOfPorts: routeClearOfPorts };
