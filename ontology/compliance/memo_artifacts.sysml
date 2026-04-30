package memo::compliance::artifacts {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def ControlledArtifact :> TraceableElement { attribute version : String; attribute lifecycleState : LifecycleStateKind; attribute artifactKind : ArtifactKind; attribute owner : String; attribute approvalStatus : String; }
}
