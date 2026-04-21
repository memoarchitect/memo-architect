package MEMO_Ontology_Arch_Functional {

    part def Function {
        attribute functionId : String;
        attribute name : String;
        attribute description : String;
        attribute safetyClass : String;
    }

    part def DataObject {
        attribute name : String;
        attribute dataType : String;
        attribute format : String;
        attribute sensitivity : String;
    }

    part def ConstraintDefinition {
        attribute constraintId : String;
        attribute expression : String;
        attribute constraintType : String;
    }
}
