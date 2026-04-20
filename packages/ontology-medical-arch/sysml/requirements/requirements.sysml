package MEMO_Ontology_MedicalArch_Requirements {

    enum def RequirementCategory {
        enum Stakeholder;
        enum System;
        enum Functional;
        enum NonFunctional;
        enum Technical;
        enum Interface;
        enum Regulatory;
        enum Safety;
        enum Security;
        enum Clinical;
        enum Constraint;
        enum Specification;
    }

    enum def EARSTemplate {
        enum Ubiquitous;
        enum EventDriven;
        enum StateDriven;
        enum Optional;
        enum Unwanted;
        enum FreeForm;
    }

    enum def RequirementModality {
        enum Shall;
        enum Will;
        enum Should;
        enum May;
    }

    requirement def Requirement {
        attribute reqId : String;
        attribute title : String;
        attribute text : String;
        attribute category : RequirementCategory;
        attribute syntaxStyle : EARSTemplate;
        attribute modality : RequirementModality;
        attribute priority : String;
        attribute status : String;
        attribute rationale : String;
        attribute source : String;
        attribute domain : String;
        attribute topic : String;
        attribute scope : String;
    }

    // ─── Aggregation (folded from ontology-extensions/requirements-advanced) ──
    part def RequirementSet {
        attribute name : String;
    }
}
