package MEMO_Ontology_Core_Analysis {

    part def Constraint {
        attribute name : String;
        attribute expression : String;
    }

    part def Assumption {
        attribute name : String;
        attribute statement : String;
    }

    part def Measure {
        attribute name : String;
        attribute unit : String;
    }
}
