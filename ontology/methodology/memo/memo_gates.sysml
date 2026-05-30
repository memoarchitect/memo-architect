package memo {
    package methodology {
        package gates {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;

            part def QualityGate :> TraceableElement {
                attribute gateStage : WorkflowStageKind;
                attribute passCriteria : String;
            }
        }
    }
}
