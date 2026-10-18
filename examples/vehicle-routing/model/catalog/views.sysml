package memo_vehicle_routing_views {
    private import memo_vehicle_routing::*;
    private import memo_viewpoints_definitions::*;
    private import memo_core_enumerations::*;
    private import memo_core_common::*;

    view vehicleRoutingPilot : MemoDiagramView {
        @MemoIdentity { :>> label = "Vehicle routing comparison"; }
        expose memo_vehicle_routing::*;
        attribute depth = 5;
        attribute :>> viewKind = DiagramViewKind::interconnection;
        attribute :>> diagramType = "ibd";
    }
    // Same model, separate view: proves renderer selection is diagram-specific.
    view vehicleReference : MemoDiagramView {
        @MemoIdentity { :>> label = "Vehicle reference — default renderer"; }
        expose memo_vehicle_routing::*;
        attribute depth = 5;
        attribute :>> viewKind = DiagramViewKind::interconnection;
        attribute :>> diagramType = "ibd";
    }
}
