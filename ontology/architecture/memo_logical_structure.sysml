package memo::architecture::logical_structure {
    private import memo::core::common::*;
    part def LogicalComponent :> ArchitectureElement { attribute responsibility : String; attribute decompositionLevel : String; attribute safetyPartition : String; }
}
