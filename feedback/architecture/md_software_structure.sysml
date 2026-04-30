package md::architecture::software_structure {
    private import md::core::common::*;
    private import md::core::enumerations::*;
    part def SoftwareSystem :> ArchitectureElement { attribute version : String; attribute lifecycleState : LifecycleStateKind; attribute safetyClass : SafetyClassKind; attribute complexity : ComplexityKind; attribute operatingSystem : String; }
    part def SoftwareComponent :> ArchitectureElement { attribute responsibility : String; attribute safetyClass : SafetyClassKind; attribute complexity : ComplexityKind; attribute periodMs : Real; attribute deadlineMs : Real; attribute wcetMs : Real; attribute schedulingPolicy : SchedulingPolicyKind; }
}
