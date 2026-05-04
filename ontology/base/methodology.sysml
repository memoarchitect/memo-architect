// Methodology scope helpers per Epic B-3.
// Multi-valued attributes collapsed to scalar pending grammar extension (ADR-1-15).
// Bare imports (no `private`) per ADR-1-16 fallback.
// Instances use repeated scalar attribute usages to enumerate set entries
// (see ADR-1-15 example: `attribute includedArchLayer = "operational";`).
package memo::base::methodology {
    import memo::core::common::*;
    import memo::base::dimensions::*;

    part def MethodologyLayerSet :> TraceableElement {
        attribute setName : String;
        attribute layer : String;
    }

    part def MethodologyStandardSet :> TraceableElement {
        attribute setName : String;
        attribute standard : String;
    }

    part def MethodologyArtifactSet :> TraceableElement {
        attribute setName : String;
        attribute artifactKind : String;
    }

    part def MethodologyViewpointTypeSet :> TraceableElement {
        attribute setName : String;
        attribute viewpointType : String;
    }

    part def MethodologyScope :> TraceableElement {
        attribute scopeName : String;
        attribute includedArchLayer : String;
        attribute includedStandard : String;
        attribute includedArtifactKind : String;
        attribute includedViewpointType : String;
        attribute excludedKind : String;
    }

    part def ElementKindAlias :> TraceableElement {
        attribute methodTerm : String;
        attribute concreteKind : String;
        attribute concreteOntology : String;
    }
}
