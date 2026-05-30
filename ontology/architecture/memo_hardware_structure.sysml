package memo {
    package architecture {
        package hardware_structure {
            private import memo::core::common::*;
            part def HardwareAssembly specializes ArchitectureElement { attribute responsibility : String; attribute safetyRole : String; }
        }
    }
}
