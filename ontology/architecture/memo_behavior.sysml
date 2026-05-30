package memo {
    package architecture {
        package behavior {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;
            part def BehaviorMachine specializes ArchitectureElement { attribute machineKind : String; attribute executionSemantics : String; }
            part def ModeState specializes ArchitectureElement { attribute modeKind : String; attribute entryCondition : String; attribute exitCondition : String; }
            part def Transition specializes ArchitectureElement { attribute trigger : String; attribute guardSummary : String; attribute effectSummary : String; attribute priority : Integer; attribute sameStepCritical : Boolean; }
            part def BehaviorProperty specializes VerifiableElement { attribute propertyKind : BehaviorPropertyKind; attribute languageKind : PropertyLanguageKind; attribute formalExpression : String; }
            part def AssumeProperty specializes BehaviorProperty;
            part def GuaranteeProperty specializes BehaviorProperty;
            part def Contract specializes VerifiableElement { attribute contractScope : String; }
            part def PropertySet specializes VerifiableElement { attribute propertySetScope : String; }
        }
    }
}
