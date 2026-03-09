// ============================================================================
// MEMO Ontology — Cross-Cutting Types
// Data types, tests, standards, and regulatory references.
// ============================================================================

package MEMO_Ontology_CrossCutting {

    // ═══════════════════════════════════════════════════════════════════════
    // CROSS-CUTTING TYPES
    // ═══════════════════════════════════════════════════════════════════════

    attribute def DataType { }

    attribute def RosMessage :> DataType { }

    part def Test {
        doc /* A verification or validation activity. */
        attribute name : String;
        attribute testId : String;
    }

    part def Standard {
        doc /* A regulatory standard referenced by requirements. */
        attribute name : String;
        attribute version : String;
    }

    part def RegulatoryRequirement {
        doc /* A specific clause from a regulatory standard. */
        attribute name : String;
        attribute standardRef : String;
        attribute clause : String;
    }
}
