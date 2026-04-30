package memo::architecture::behavior {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def BehaviorMachine :> ArchitectureElement { attribute machineKind : String; attribute executionSemantics : String; }
    part def ModeState :> ArchitectureElement { attribute modeKind : String; attribute entryCondition : String; attribute exitCondition : String; }
    part def Transition :> ArchitectureElement { attribute trigger : String; attribute guardSummary : String; attribute effectSummary : String; attribute priority : Integer; attribute sameStepCritical : Boolean; }
    part def BehaviorProperty :> VerifiableElement { attribute propertyKind : BehaviorPropertyKind; attribute languageKind : PropertyLanguageKind; attribute formalExpression : String; }
    part def AssumeProperty :> BehaviorProperty;
    part def GuaranteeProperty :> BehaviorProperty;
    part def Contract :> VerifiableElement { attribute contractScope : String; }
    part def PropertySet :> VerifiableElement { attribute propertySetScope : String; }
}
