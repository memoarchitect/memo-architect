package md::architecture::logical_structure {
    private import md::core::common::*;
    part def LogicalComponent :> ArchitectureElement { attribute responsibility : String; attribute decompositionLevel : String; attribute safetyPartition : String; }
}
