# Router comparison fixtures

## `pump-ibd-routing.json`

The real routing problem the pump-enclosure IBD hands to the connector router:
five part boxes inside the enclosure frame and the twenty port-to-port
connectors between them, in absolute canvas coordinates with the port face each
connector is anchored to.

It is committed rather than regenerated because it is a *measurement baseline* —
comparing two routers is only meaningful against a fixed problem. Regenerate it
only when the IBD template's own geometry changes on purpose, by:

1. building the pump project's model (`parseFiles` + `buildMemoModel` over
   `~/sandbox/pump-ibd/model`);
2. running `computeInterconnectionLayout` on it with the view's element-kind
   filter and `relationshipTypes: ['Composes', 'ExchangesWith']`;
3. flattening the resulting nodes to absolute coordinates and re-deriving each
   edge's anchors from its `sourceOffset` / `targetOffset` and sides — which is
   exactly what the template itself passes to `routeOrthogonalEdges`.

The frame node is excluded from the obstacles, as it is in the template: a
container that encloses a connector's own endpoint cannot be an obstacle to it.
