package memo::artifacts {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;

    part def ArtifactKindDef :> TraceableElement {
        attribute documentTitle : String;
        attribute regulatoryRef : String;
        attribute artifactKind : ArtifactKind;
    }

    part def RiskManagementPlan :> ArtifactKindDef {
        attribute documentTitle = "Risk Management Plan";
        attribute regulatoryRef = "ISO 14971:2019 §4.4";
    }
}
