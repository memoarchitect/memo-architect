package memo_vehicle_routing_project {
    private import memo_vehicle_routing::*;
    private import memo_vehicle_routing_views::*;
    private import memo_core_common::*;
    private import memo_core_enumerations::*;
    private import memo_methodology_core::*;
    private import memo_methodology_profiles::*;
    part projectBinding : ModelMethodBinding {
        @MemoIdentity { :>> label = "Vehicle IBD"; }
        attribute :>> modelName = "Vehicle IBD";
        ref :>> selectedMethodology = mdDefaultDefinition;
        attribute :>> scopeMode = ScopeModeKind::explicit;
    }
}
