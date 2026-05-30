package memo {
    package methodology {
        package workflow {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;

            part def WorkflowStep :> TraceableElement {
                attribute stepOrder : Integer;
                attribute stage : WorkflowStageKind;
                attribute objective : String;
                attribute entryCriteria : String;
                attribute exitCriteria : String;
            }
        }
    }
}
