package MEMO_Ontology_Core_Purpose {

    part def Actor {
        attribute name : String;
    }

    part def Stakeholder :> Actor {
        attribute role : String;
    }

    requirement def Goal {
        attribute goalId : String;
        attribute title : String;
    }

    requirement def Concern {
        attribute concernId : String;
        attribute title : String;
    }

    part def Capability {
        attribute name : String;
        attribute level : String;
    }
}
