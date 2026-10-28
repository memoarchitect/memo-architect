package memo_vehicle_routing_views {
    private import memo_vehicle_routing::*;
    private import memo_viewpoints_definitions::*;
    private import memo_core_enumerations::*;
    private import memo_core_common::*;

    view vehicleInterconnection : MemoDiagramView {
        @MemoIdentity { :>> label = "Vehicle interconnection"; }
        expose memo_vehicle_routing::*;
        attribute depth = 5;
        attribute :>> viewKind = DiagramViewKind::interconnection;
        attribute :>> diagramType = "ibd";
    }
}
