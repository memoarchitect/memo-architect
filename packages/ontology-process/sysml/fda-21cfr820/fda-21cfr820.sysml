package MEMO_Ontology_Process_FDA21CFR820 {

    // FDA 21 CFR Part 820 — Quality System Regulation (QSR).
    // Also covers FDA eSTAR and Design History File requirements.

    part def DesignHistoryFile :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute dhfId : String;
        attribute deviceModel : String;
        attribute designPhasesCovered : String;
        attribute complete : Boolean;
    }

    part def DHFArtifact :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute dhfRef : String;
        attribute dhfSection : String;
        attribute artifactType : String;
    }

    part def DeviceMasterRecord :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute dmrId : String;
        attribute deviceDescription : String;
        attribute specificationsLocation : String;
        attribute manufacturingLocation : String;
    }

    part def DeviceHistoryRecord :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute dhrId : String;
        attribute lotNumber : String;
        attribute manufacturingDate : String;
        attribute quantityManufactured : Integer;
        attribute quantityReleased : Integer;
    }

    part def CorrectionRemovalReport :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute reportId : String;
        attribute fdaReportNumber : String;
        attribute deviceInvolved : String;
        attribute actionTaken : String;
        attribute reportDate : String;
    }

    connection def ContainsArtifact {
        end dhf : DesignHistoryFile [1];
        end artifact : DHFArtifact [0..*];
    }

    connection def InstantiatesDMR {
        end dhr : DeviceHistoryRecord [1];
        end dmr : DeviceMasterRecord [1];
    }
}
