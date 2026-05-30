package memo {
    package methodology {
        package patterns {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;

            part def ModelingPattern :> TraceableElement {
                attribute intent : String;
                attribute stage : WorkflowStageKind;
                attribute strength : RuleStrengthKind;
            }
        }
    }
}
