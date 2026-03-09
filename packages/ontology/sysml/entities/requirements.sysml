// ============================================================================
// MEMO Ontology — Requirements Domain
// Traceable needs hierarchy
// All are requirement defs — participate in satisfy/verify/trace.
// ============================================================================

package MEMO_Ontology_Requirements {

    // ═══════════════════════════════════════════════════════════════════════
    // 2. REQUIREMENTS — Traceable needs hierarchy
    //    All are requirement defs — participate in satisfy/verify/trace.
    // ═══════════════════════════════════════════════════════════════════════

    enum def RequirementsCategory {
        enum Functional;
        enum Performance;
        enum Safety;
        enum Security;
        enum UserInterface;
        enum DataDefinition;
        enum Deployment;
        enum Operation;
        enum Network;
        enum Maintenance;
        enum Regulatory;
    }

    requirement def Requirement {
        doc /* Base requirement — all specific kinds specialize this. */
        attribute reqId : String;
        attribute title : String;
        attribute group : String;
        attribute rationale : String;
        attribute category : RequirementsCategory;
    }

    requirement def UserNeed :> Requirement {
        doc /* Validated user/clinical need before system decomposition. */
        attribute isMet : Boolean;
    }

    requirement def SystemRequirement :> Requirement {
        doc /* System-level requirement derived from user needs. */
    }

    requirement def SoftwareRequirement :> Requirement {
        doc /* Software requirement derived from system requirements. */
    }

    requirement def HardwareRequirement :> Requirement {
        doc /* Hardware-specific requirement. */
    }

    requirement def DesignSpecification :> Requirement {
        doc /* Detailed design specification — bridges requirements to architecture. */
    }

    requirement def OtherRequirement :> Requirement {
        doc /* Regulatory, performance, or cross-cutting requirements. */
    }
}
