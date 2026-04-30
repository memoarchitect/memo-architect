package memo::architecture::assurance {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def VerificationCase :> VerifiableElement { attribute methodKind : VerificationMethodKind; attribute acceptanceCriteria : String; attribute status : String; }
    part def TestArtifact :> EvidenceElement { attribute version : String; attribute lifecycleState : LifecycleStateKind; attribute artifactKind : ArtifactKind; attribute resultSummary : String; }
    part def Evidence :> EvidenceElement { attribute version : String; attribute lifecycleState : LifecycleStateKind; attribute evidenceType : String; attribute integrityStatus : String; }
}
