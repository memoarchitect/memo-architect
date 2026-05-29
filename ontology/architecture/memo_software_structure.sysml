package memo::architecture::software_structure {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def SoftwareSystem specializes ArchitectureElement { attribute version : String; attribute lifecycleState : LifecycleStateKind; attribute safetyClass : SafetyClassKind; attribute complexity : ComplexityKind; attribute operatingSystem : String; }
    part def SoftwareComponent specializes ArchitectureElement { attribute responsibility : String; attribute safetyClass : SafetyClassKind; attribute complexity : ComplexityKind; attribute periodMs : Real; attribute deadlineMs : Real; attribute wcetMs : Real; attribute schedulingPolicy : SchedulingPolicyKind; }
}
