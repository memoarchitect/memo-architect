package memo {
    package architecture {
        package logical_structure {
            private import memo::core::common::*;
            part def LogicalComponent specializes ArchitectureElement { attribute responsibility : String; attribute decompositionLevel : String; attribute safetyPartition : String; }
        }
    }
}
