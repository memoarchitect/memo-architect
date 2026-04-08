package MEMO_Ontology_Core_Physical {

    part def PhysicalComponent {
        attribute name : String;
        attribute manufacturer : String;
        attribute weight : String;
    }

    part def ElectricalComponent :> PhysicalComponent {
        attribute voltageRating : String;
    }

    part def MechanicalComponent :> PhysicalComponent { }
}
