package MEMO_Ontology_MedicalArch_Logical {

    part def LogicalComponent {
        attribute name : String;
        attribute level : String;
    }

    part def ArchitectureDecision {
        attribute name : String;
    }

    part def QualityAttribute {
        attribute name : String;
    }

    // ─── Decision context (folded from ontology-extensions/logical-advanced) ──
    part def ArchitectureRationale {
        attribute name : String;
    }

    part def Question {
        attribute name : String;
    }
}
