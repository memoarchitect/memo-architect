// Multi-valued attributes collapsed to scalar pending grammar extension (ADR-1-16).
// Bare import (no `private`) per ADR-1-16 fallback.
package memo::base::dimensions {
    import memo::core::common::*;

    enum def DimensionKind {
        enum architecture;
        enum compliance;
        enum artifact;
        enum viewpointType;
    }

    part def ElementKind :> TraceableElement {
        attribute kindName : String;
        attribute primaryDimension : DimensionKind;
    }

    part def ArchitectureElementKind :> ElementKind {
        attribute archLayer : String;
    }

    part def ComplianceElementKind :> ElementKind {
        attribute standard : String;
        attribute clause : String;
    }

    part def ArtifactElementKind :> ElementKind {
        attribute documentTitle : String;
        attribute regulatoryReference : String;
    }

    part def ViewpointTypeKind :> ElementKind {
        attribute typeId : String;
    }
}
