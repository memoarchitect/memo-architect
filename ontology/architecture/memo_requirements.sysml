package memo::architecture::requirements {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    requirement def StakeholderNeed :> RequirementDriver { attribute statement : String; attribute priority : String; }
    part def RiskDriver :> RequirementDriver { attribute driverKind : String; }
    requirement def Requirement :> VerifiableElement {
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
    requirement def SystemRequirement :> Requirement;
    requirement def SoftwareRequirement :> Requirement { attribute safetyClass : SafetyClassKind; }
    requirement def HardwareRequirement :> Requirement { attribute electricalSafetyRelevant : Boolean; }
}
