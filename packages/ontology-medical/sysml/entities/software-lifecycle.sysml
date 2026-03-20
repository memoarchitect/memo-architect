package MEMO_Ontology_Medical_SoftwareLifecycle {

    enum def SoftwareSafetyClass {
        enum A;
        enum B;
        enum C;
    }

    part def SoftwareSystem {
        attribute name : String;
    }

    part def SoftwareItem {
        attribute name : String;
        attribute safetyClass : SoftwareSafetyClass;
    }

    part def SoftwareUnit {
        attribute name : String;
    }

    part def SOUPItem {
        attribute name : String;
        attribute supplier : String;
    }

    part def SoftwareAnomaly {
        attribute anomalyId : String;
        attribute title : String;
    }

    part def MaintenanceRelease {
        attribute version : String;
    }
}
