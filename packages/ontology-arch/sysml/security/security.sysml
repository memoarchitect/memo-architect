package MEMO_Ontology_Arch_Security {

    part def TrustBoundary {
        attribute boundaryId : String;
        attribute name : String;
        attribute description : String;
    }

    part def Asset {
        attribute assetId : String;
        attribute name : String;
        attribute assetType : String;
        attribute confidentiality : String;
        attribute integrity : String;
        attribute availability : String;
    }

    part def ThreatScenario {
        attribute threatId : String;
        attribute title : String;
        attribute stride : String;
        attribute likelihood : String;
        attribute impact : String;
    }

    part def Control {
        attribute controlId : String;
        attribute title : String;
        attribute controlType : String;
        attribute implementationStatus : String;
    }
}
