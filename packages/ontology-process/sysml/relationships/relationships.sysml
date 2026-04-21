package MEMO_Ontology_Process_Relationships {

    // Cross-package bridges: process → arch.
    // Process imports arch (never the reverse).
    // Note: ProducesEvidence is defined in ontology-arch/relationships/ and extended here by
    // specializing for ProcessActivity→Evidence.

    connection def TracedTo {
        end workProduct : MEMO_Ontology_Process_Common::WorkProduct [1];
        end archElement[1];
    }

    connection def VerifiesArch {
        end workProduct : MEMO_Ontology_Process_Common::WorkProduct [1];
        end req : MEMO_Ontology_Arch_Verification::Requirement [1];
    }

    connection def GovernedBy {
        end subject[1];
        end standard : String;
        attribute clause : String;
    }

    connection def SourceStandard {
        end workProduct : MEMO_Ontology_Process_Common::WorkProduct [1];
        end standard : String;
        attribute clause : String;
    }

    connection def RegulatoryClause {
        end req : MEMO_Ontology_Arch_Verification::Requirement [1];
        end standard : String;
        attribute clause : String;
    }
}
