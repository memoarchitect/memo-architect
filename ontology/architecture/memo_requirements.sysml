package memo::architecture::requirements {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    requirement def StakeholderNeed specializes RequirementDriver { attribute statement : String; attribute priority : String; }
    part def RiskDriver specializes RequirementDriver { attribute driverKind : String; }
    requirement def Requirement specializes VerifiableElement {
        attribute statement : String;
        attribute sourceKind : RequirementSourceKind;
        attribute concernKind : ConcernKind;
        attribute status : RequirementStatusKind;
        attribute acceptanceCriteria : String;
        attribute subjectDescription : String;
        attribute actorDescription : String;
        attribute assumptionSummary : String;
        attribute guaranteeSummary : String;
    }
    requirement def SystemRequirement specializes Requirement;
    requirement def SoftwareRequirement specializes Requirement { attribute safetyClass : SafetyClassKind; }
    requirement def HardwareRequirement specializes Requirement { attribute electricalSafetyRelevant : Boolean; }
}
