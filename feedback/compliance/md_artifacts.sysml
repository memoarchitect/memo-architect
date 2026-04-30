package md::compliance::artifacts {
    private import md::core::common::*;
    private import md::core::enumerations::*;
    part def ControlledArtifact :> TraceableElement { attribute version : String; attribute lifecycleState : LifecycleStateKind; attribute artifactKind : ArtifactKind; attribute owner : String; attribute approvalStatus : String; }
}
