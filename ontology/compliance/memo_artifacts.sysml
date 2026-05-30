package memo {
    package compliance {
        package artifacts {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;
            item def ControlledArtifact specializes TraceableElement { attribute version : String; attribute lifecycleState : LifecycleStateKind; attribute artifactKind : ArtifactKind; attribute owner : String; attribute approvalStatus : String; }
        }
    }
}
